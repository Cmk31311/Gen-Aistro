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

  const sectionTabs = [
    { key: 'papers', label: `Papers (${paperCount})` },
    { key: 'searches', label: `Searches (${searchCount})` },
    { key: 'lists', label: `Lists (${listCount})` }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bookmarks" maxWidth="max-w-3xl">
      {/* Section Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-border pb-3">
        {sectionTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`relative px-3.5 py-2 text-sm transition-all font-medium ${
              activeSection === key ? 'text-accent' : 'text-content-3 hover:text-content-2'
            }`}
          >
            {label}
            {activeSection === key && <span className="absolute -bottom-[13px] left-1 right-1 h-[2.5px] bg-accent rounded-full shadow-[0_1px_8px_rgba(240,192,90,0.3)]" />}
          </button>
        ))}
      </div>

      {activeSection === 'papers' && (
        <div className="space-y-2">
          {bookmarks.papers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-content-3 text-sm">No bookmarked papers yet</p>
              <p className="text-content-3/60 text-xs mt-1">Star papers to save them here</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end space-x-3 mb-3">
                <button onClick={() => exportToCSV(bookmarks.papers)} className="text-xs text-content-3 hover:text-accent transition-all flex items-center gap-1.5 font-medium"><ExportIcon size={12} /> CSV</button>
                <button onClick={() => exportToBibTeX(bookmarks.papers)} className="text-xs text-content-3 hover:text-accent transition-all flex items-center gap-1.5 font-medium"><ExportIcon size={12} /> BibTeX</button>
              </div>
              {bookmarks.papers.map(paper => (
                <div key={paper.id} className="flex items-center justify-between p-3.5 bg-bg rounded-xl border border-border hover:border-accent/20 transition-all">
                  <div className="flex-1 mr-3">
                    <span className="text-content-1 text-sm font-medium">{paper.title}</span>
                    <span className="text-content-3 text-xs ml-2">{paper.id}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {paper.url && <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-content-3 hover:text-accent transition-all"><ExternalLinkIcon size={14} /></a>}
                    <button onClick={() => removePaperBookmark(paper.id)} className="text-content-3 hover:text-red-400 transition-all"><CloseIcon size={14} /></button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeSection === 'searches' && (
        <div className="space-y-2">
          {bookmarks.searches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-content-3 text-sm">No saved searches yet</p>
              <p className="text-content-3/60 text-xs mt-1">Save search results to revisit them later</p>
            </div>
          ) : (
            bookmarks.searches.map((search, i) => (
              <div key={i} className="p-3.5 bg-bg rounded-xl border border-border hover:border-accent/20 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-3">
                    <div className="text-content-1 text-sm font-semibold">{search.query}</div>
                    {search.answer && <div className="text-content-3 text-xs mt-1.5 line-clamp-2 leading-relaxed">{search.answer}</div>}
                  </div>
                  <button onClick={() => removeSearchBookmark(i)} className="text-content-3 hover:text-red-400 transition-all flex-shrink-0"><CloseIcon size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeSection === 'lists' && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateList()} placeholder="New reading list name..." className="flex-1 px-3.5 py-2.5 bg-bg border border-border rounded-xl text-sm text-content-1 placeholder-content-3 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20" />
            <button onClick={handleCreateList} disabled={!newListName.trim()} className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-black rounded-xl text-sm font-semibold disabled:opacity-40 transition-all active:scale-[0.98]">Create</button>
          </div>

          {bookmarks.readingLists.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-content-3 text-sm">No reading lists yet</p>
              <p className="text-content-3/60 text-xs mt-1">Create a list to organize your papers</p>
            </div>
          ) : (
            bookmarks.readingLists.map(list => (
              <div key={list.id} className="bg-bg rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-content-1 font-semibold text-sm">{list.name}</h4>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-content-3 font-medium">{list.papers.length} papers</span>
                    {list.papers.length > 0 && <button onClick={() => exportToCSV(list.papers)} className="text-content-3 hover:text-accent transition-all font-medium">Export</button>}
                    <button onClick={() => deleteReadingList(list.id)} className="text-content-3 hover:text-red-400 transition-all font-medium">Delete</button>
                  </div>
                </div>
                {list.papers.length > 0 && (
                  <div className="space-y-1.5">
                    {list.papers.map(paper => (
                      <div key={paper.id} className="flex items-center justify-between text-sm p-2.5 bg-surface-1 rounded-lg border border-border hover:border-border-hover transition-all">
                        <span className="text-content-2 line-clamp-1 flex-1">{paper.title}</span>
                        <button onClick={() => removeFromReadingList(list.id, paper.id)} className="text-content-3 hover:text-red-400 ml-2 transition-all"><CloseIcon size={12} /></button>
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
