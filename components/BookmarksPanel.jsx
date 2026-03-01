'use client';
import { useState } from 'react';
import { useBookmarks } from '../context/BookmarkContext';
import { exportToCSV, exportToBibTeX } from '../lib/exportUtils';
import Modal from '../ui/Modal';
import { ExternalLinkIcon, CloseIcon, ExportIcon } from '../ui/Icons';

export default function BookmarksPanel({ isOpen, onClose }) {
  const {
    bookmarks, removePaperBookmark, removeSearchBookmark,
    createReadingList, deleteReadingList, removeFromReadingList,
    paperCount, searchCount, listCount
  } = useBookmarks();
  const [activeSection, setActiveSection] = useState('papers');
  const [newListName, setNewListName] = useState('');

  const handleCreateList = () => {
    if (newListName.trim()) {
      createReadingList(newListName.trim());
      setNewListName('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bookmarks" maxWidth="max-w-3xl">
      {/* Section Tabs */}
      <div className="flex space-x-1 mb-5">
        {[
          { key: 'papers', label: `Papers (${paperCount})` },
          { key: 'searches', label: `Searches (${searchCount})` },
          { key: 'lists', label: `Lists (${listCount})` }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activeSection === key ? 'bg-[#1a1a25] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Papers */}
      {activeSection === 'papers' && (
        <div className="space-y-2">
          {bookmarks.papers.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">No bookmarked papers yet</p>
          ) : (
            <>
              <div className="flex justify-end space-x-3 mb-3">
                <button onClick={() => exportToCSV(bookmarks.papers)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
                  <ExportIcon size={12} /> CSV
                </button>
                <button onClick={() => exportToBibTeX(bookmarks.papers)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
                  <ExportIcon size={12} /> BibTeX
                </button>
              </div>
              {bookmarks.papers.map(paper => (
                <div key={paper.id} className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg border border-[#222230]">
                  <div className="flex-1 mr-3">
                    <span className="text-zinc-300 text-sm">{paper.title}</span>
                    <span className="text-zinc-600 text-xs ml-2">{paper.id}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {paper.url && (
                      <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-indigo-400 transition-colors">
                        <ExternalLinkIcon size={14} />
                      </a>
                    )}
                    <button onClick={() => removePaperBookmark(paper.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                      <CloseIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Searches */}
      {activeSection === 'searches' && (
        <div className="space-y-2">
          {bookmarks.searches.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">No saved searches yet</p>
          ) : (
            bookmarks.searches.map((search, i) => (
              <div key={i} className="p-3 bg-[#0a0a0f] rounded-lg border border-[#222230]">
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-3">
                    <div className="text-zinc-200 text-sm font-medium">{search.query}</div>
                    {search.answer && <div className="text-zinc-500 text-xs mt-1 line-clamp-2">{search.answer}</div>}
                  </div>
                  <button onClick={() => removeSearchBookmark(i)} className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <CloseIcon size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reading Lists */}
      {activeSection === 'lists' && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
              placeholder="New reading list name..."
              className="flex-1 px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            />
            <button
              onClick={handleCreateList}
              disabled={!newListName.trim()}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-400 disabled:opacity-40 transition-colors"
            >
              Create
            </button>
          </div>

          {bookmarks.readingLists.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">No reading lists yet</p>
          ) : (
            bookmarks.readingLists.map(list => (
              <div key={list.id} className="bg-[#0a0a0f] rounded-lg border border-[#222230] p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-zinc-200 font-medium text-sm">{list.name}</h4>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-zinc-600">{list.papers.length} papers</span>
                    {list.papers.length > 0 && (
                      <button onClick={() => exportToCSV(list.papers)} className="text-zinc-500 hover:text-zinc-300 transition-colors">Export</button>
                    )}
                    <button onClick={() => deleteReadingList(list.id)} className="text-zinc-500 hover:text-red-400 transition-colors">Delete</button>
                  </div>
                </div>
                {list.papers.length > 0 && (
                  <div className="space-y-1">
                    {list.papers.map(paper => (
                      <div key={paper.id} className="flex items-center justify-between text-sm p-2 bg-[#12121a] rounded border border-[#2a2a3a]">
                        <span className="text-zinc-400 line-clamp-1 flex-1">{paper.title}</span>
                        <button onClick={() => removeFromReadingList(list.id, paper.id)} className="text-zinc-600 hover:text-red-400 ml-2 transition-colors">
                          <CloseIcon size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}
