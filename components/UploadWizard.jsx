'use client';
import React, { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { detectColumns } from '../lib/columnDetector';
import { chunkText } from '../lib/chunker';
import { getSupabase } from '../lib/supabase';

const BATCH_SIZE = 20;

const ACCEPTED_TYPES = '.csv,.txt,.md,.pdf';

export default function UploadWizard({ onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState('csv'); // 'csv' | 'text' | 'pdf'
  const [headers, setHeaders] = useState([]);
  const [preview, setPreview] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [plainText, setPlainText] = useState(''); // for txt/md/pdf
  const [mapping, setMapping] = useState({ text: null, title: null, year: null, url: null, doc_id: null });
  const [datasetName, setDatasetName] = useState('');
  const [datasetDesc, setDatasetDesc] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback(async (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    const supported = ['csv', 'txt', 'md', 'pdf'];
    if (!supported.includes(ext)) {
      setError(`Unsupported file type. Please upload: ${supported.join(', ')}`);
      return;
    }
    setError('');
    setFile(f);
    setDatasetName(f.name.replace(/\.[^.]+$/, ''));

    if (ext === 'csv') {
      setFileType('csv');
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            setError('Failed to parse CSV: ' + results.errors[0].message);
            return;
          }
          const cols = results.meta.fields || [];
          setHeaders(cols);
          setPreview(results.data.slice(0, 5));
          setAllRows(results.data);
          setMapping(detectColumns(cols));
          setStep(2);
        },
        error: (err) => setError('Failed to read file: ' + err.message),
      });
    } else if (ext === 'txt' || ext === 'md') {
      setFileType('text');
      const text = await f.text();
      setPlainText(text);
      setStep(2);
    } else if (ext === 'pdf') {
      setFileType('pdf');
      setProgress({ current: 0, total: 0, status: 'Extracting PDF text...' });
      setStep(2);
      try {
        const formData = new FormData();
        formData.append('file', f);
        const res = await fetch('/api/parse-document', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'PDF extraction failed');
        setPlainText(data.text || '');
        setProgress({ current: 0, total: 0, status: '' });
      } catch (err) {
        setError(err.message);
        setStep(1);
      }
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  const handleMappingChange = (role, value) => {
    setMapping((prev) => ({ ...prev, [role]: value || null }));
  };

  const startProcessing = async () => {
    setProcessing(true);
    setError('');
    setStep(3);

    try {
      // Build chunks depending on file type
      const allChunks = [];

      if (fileType === 'text' || fileType === 'pdf') {
        // Single document: chunk the full plain text
        if (!plainText.trim()) {
          setError('No text content found in the file.');
          setProcessing(false);
          setStep(2);
          return;
        }
        const chunks = chunkText(plainText);
        for (const chunk of chunks) {
          allChunks.push({
            text: chunk.text,
            chunk_index: chunk.chunk_index,
            doc_title: datasetName,
            doc_id: 'doc_0',
            year: null,
            url: null,
          });
        }
      } else {
        // CSV: build chunks from all rows
        for (let i = 0; i < allRows.length; i++) {
          const row = allRows[i];

          const docTitle = mapping.title ? row[mapping.title] : `Row ${i + 1}`;
          const year = mapping.year ? parseInt(row[mapping.year]) || null : null;
          const url = mapping.url ? row[mapping.url] : null;
          const docId = mapping.doc_id ? row[mapping.doc_id] : `doc_${i}`;

          // Build rich text: always include the title/name + all other columns
          const primaryText = mapping.text ? row[mapping.text] : '';
          const otherFields = headers
            .filter(h => h !== mapping.text && h !== mapping.url)
            .map(h => {
              const val = row[h];
              if (!val || String(val).trim() === '') return null;
              return `${h}: ${val}`;
            })
            .filter(Boolean)
            .join('\n');

          const fullText = [docTitle ? `Name: ${docTitle}` : null, otherFields, primaryText]
            .filter(Boolean)
            .join('\n')
            .trim();

          if (!fullText) continue;

          const chunks = chunkText(fullText);
          for (const chunk of chunks) {
            allChunks.push({
              text: chunk.text,
              chunk_index: chunk.chunk_index,
              doc_title: docTitle,
              doc_id: docId,
              year,
              url,
            });
          }
        }
      }

      if (allChunks.length === 0) {
        setError('No valid text content found in the selected column.');
        setProcessing(false);
        setStep(2);
        return;
      }

      setProgress({ current: 0, total: allChunks.length, status: 'Creating dataset...' });

      // Get auth token
      const { data: { session } } = await getSupabase().auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      // Create dataset record
      const createRes = await fetch('/api/datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: datasetName,
          description: datasetDesc || null,
          column_mapping: mapping,
          total_chunks: allChunks.length,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || 'Failed to create dataset');
      }

      const { id: datasetId } = await createRes.json();

      // Process in batches
      setProgress((p) => ({ ...p, status: 'Embedding & storing chunks...' }));

      for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
        const batch = allChunks.slice(i, i + BATCH_SIZE);

        const processRes = await fetch(`/api/datasets/${datasetId}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ chunks: batch }),
        });

        if (!processRes.ok) {
          const err = await processRes.json();
          throw new Error(err.error || 'Processing failed');
        }

        setProgress({
          current: Math.min(i + BATCH_SIZE, allChunks.length),
          total: allChunks.length,
          status: `Processed ${Math.min(i + BATCH_SIZE, allChunks.length)} of ${allChunks.length} chunks...`,
        });
      }

      // Finalize
      setProgress((p) => ({ ...p, status: 'Finalizing dataset...' }));
      const finalizeRes = await fetch(`/api/datasets/${datasetId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!finalizeRes.ok) throw new Error('Failed to finalize dataset');

      setProgress((p) => ({ ...p, status: 'Done!', current: p.total }));
      onComplete?.(datasetId);
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message);
      setProcessing(false);
    }
  };

  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="bg-surface-1 border border-border rounded-2xl p-6 shadow-card max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              step >= s ? 'bg-accent text-black' : 'bg-surface-3 text-content-3'
            }`}>
              {s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-accent' : 'bg-surface-3'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: File Upload */}
      {step === 1 && (
        <div>
          <h3 className="text-lg font-semibold text-content-1 mb-4">Upload your CSV dataset</h3>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-accent/50 rounded-xl p-12 text-center cursor-pointer transition-all hover:bg-surface-2/50"
          >
            <div className="text-4xl mb-3">📄</div>
            <p className="text-content-2 mb-1">Drag & drop your file here</p>
            <p className="text-content-3 text-sm">or click to browse</p>
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              {['CSV', 'TXT', 'MD', 'PDF*'].map(t => (
                <span key={t} className="px-2.5 py-1 bg-surface-2 text-content-3 rounded-md text-xs border border-border font-medium">{t}</span>
              ))}
            </div>
            <p className="text-content-3/60 text-xs mt-2">*PDF requires <code className="bg-surface-2 px-1 rounded">npm install pdf-parse</code></p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (fileType === 'text' || fileType === 'pdf') && (
        <div>
          <h3 className="text-lg font-semibold text-content-1 mb-1">Confirm document details</h3>
          <p className="text-sm text-content-3 mb-4">
            Extracted {plainText.length.toLocaleString()} characters from <strong>{file?.name}</strong>
          </p>
          <div className="mb-4">
            <label className="block text-sm text-content-3 mb-1">Dataset name</label>
            <input
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-content-1 focus:outline-none focus:border-accent/50 transition-all text-sm"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm text-content-3 mb-1">Description (optional)</label>
            <input
              value={datasetDesc}
              onChange={(e) => setDatasetDesc(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-content-1 focus:outline-none focus:border-accent/50 transition-all text-sm"
              placeholder="Brief description"
            />
          </div>
          <div className="mb-6 bg-surface-2/50 rounded-xl border border-border p-4">
            <p className="text-xs text-content-3 mb-1 font-medium">Text preview</p>
            <p className="text-xs text-content-2 line-clamp-6 whitespace-pre-wrap">{plainText.slice(0, 600)}...</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setStep(1); setFile(null); setPlainText(''); }} className="px-4 py-2 text-sm text-content-3 hover:text-content-1 transition-colors">Back</button>
            <button onClick={onCancel} className="px-4 py-2 text-sm text-content-3 hover:text-content-1 transition-colors">Cancel</button>
            <button onClick={startProcessing} className="ml-auto px-6 py-2 bg-gradient-to-r from-accent to-accent-hover text-black font-semibold rounded-lg text-sm hover:shadow-glow transition-all">
              Start Processing
            </button>
          </div>
        </div>
      )}

      {step === 2 && fileType === 'csv' && (
        <div>
          <h3 className="text-lg font-semibold text-content-1 mb-1">Map your columns</h3>
          <p className="text-sm text-content-3 mb-4">
            We detected {allRows.length} rows and {headers.length} columns. Confirm the column mapping below.
          </p>

          {/* Dataset name */}
          <div className="mb-4">
            <label className="block text-sm text-content-3 mb-1">Dataset name</label>
            <input
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-content-1 focus:outline-none focus:border-accent/50 transition-all text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-content-3 mb-1">Description (optional)</label>
            <input
              value={datasetDesc}
              onChange={(e) => setDatasetDesc(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-content-1 focus:outline-none focus:border-accent/50 transition-all text-sm"
              placeholder="Brief description of your dataset"
            />
          </div>

          {/* Column mapping */}
          <div className="space-y-3 mb-6">
            {[
              { role: 'text', label: 'Text / Content', required: false },
              { role: 'title', label: 'Title', required: false },
              { role: 'year', label: 'Year', required: false },
              { role: 'url', label: 'URL / DOI', required: false },
              { role: 'doc_id', label: 'Document ID', required: false },
            ].map(({ role, label, required }) => (
              <div key={role} className="flex items-center gap-3">
                <label className="text-sm text-content-2 w-32 flex-shrink-0">
                  {label} {required && <span className="text-accent">*</span>}
                </label>
                <select
                  value={mapping[role] || ''}
                  onChange={(e) => handleMappingChange(role, e.target.value)}
                  className="flex-1 px-3 py-2 bg-surface-2 border border-border rounded-lg text-content-1 text-sm focus:outline-none focus:border-accent/50"
                >
                  <option value="">— None —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Preview table */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-content-2 mb-2">Preview (first 5 rows)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {headers.slice(0, 6).map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left text-content-3 border-b border-border font-medium truncate max-w-[120px]">{h}</th>
                    ))}
                    {headers.length > 6 && <th className="px-2 py-1.5 text-content-3 border-b border-border">...</th>}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {headers.slice(0, 6).map((h) => (
                        <td key={h} className="px-2 py-1.5 text-content-2 truncate max-w-[120px]">
                          {String(row[h] || '').slice(0, 60)}
                        </td>
                      ))}
                      {headers.length > 6 && <td className="px-2 py-1.5 text-content-3">...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setStep(1); setFile(null); }} className="px-4 py-2 text-sm text-content-3 hover:text-content-1 transition-colors">
              Back
            </button>
            <button onClick={onCancel} className="px-4 py-2 text-sm text-content-3 hover:text-content-1 transition-colors">
              Cancel
            </button>
            <button
              onClick={startProcessing}
              className="ml-auto px-6 py-2 bg-gradient-to-r from-accent to-accent-hover text-black font-semibold rounded-lg text-sm hover:shadow-glow transition-all"
            >
              Start Processing
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === 3 && (
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-content-1 mb-2">
            {progress.status === 'Done!' ? 'Dataset Ready!' : 'Processing your dataset...'}
          </h3>
          <p className="text-sm text-content-3 mb-6">{progress.status}</p>

          {/* Progress bar */}
          <div className="w-full bg-surface-3 rounded-full h-3 mb-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-sm text-content-3">
            {progress.current} / {progress.total} chunks ({progressPct}%)
          </p>

          {progress.status === 'Done!' && (
            <button
              onClick={() => onComplete?.()}
              className="mt-6 px-6 py-2 bg-gradient-to-r from-accent to-accent-hover text-black font-semibold rounded-lg text-sm hover:shadow-glow transition-all"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
