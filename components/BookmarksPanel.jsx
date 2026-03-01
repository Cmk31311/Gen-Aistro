'use client';
import { useState } from 'react';
import { useBookmarks } from '../context/BookmarkContext';
import { exportToCSV, exportToBibTeX } from '../lib/exportUtils';
import Modal from '../ui/Modal';

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
    <Modal isOpen={isOpen} onClose={onClose} title={`\u2606 Bookmarks & Reading Lists`} maxWidth="max-w-3xl">
      {/* Section Tabs */}
      <div className="flex space-x-2 mb-4">
        {[
          { key: 'papers', label: `Papers (${paperCount})` },
          { key: 'searches', label: `Searches (${searchCount})` },
          { key: 'lists', label: `Lists (${listCount})` }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === key ? 'bg-purple-500/30 text-purple-200' : 'bg-black/30 text-blue-200/70 hover:bg-black/40'
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
            <p className="text-blue-200/50 text-sm text-center py-8">No bookmarked papers yet. Click the star icon on any publication to bookmark it.</p>
          ) : (
            <>
              <div className="flex justify-end space-x-2 mb-2">
                <button onClick={() => exportToCSV(bookmarks.papers)} className="text-xs text-purple-300 hover:text-purple-200">Export CSV</button>
                <button onClick={() => exportToBibTeX(bookmarks.papers)} className="text-xs text-purple-300 hover:text-purple-200">Export BibTeX</button>
              </div>
              {bookmarks.papers.map(paper => (
                <div key={paper.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/10">
                  <div className="flex-1 mr-3">
                    <span className="text-blue-200 text-sm">{paper.title}</span>
                    <span className="text-blue-200/40 text-xs ml-2">{paper.id}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {paper.url && (
                      <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-green-300 text-xs hover:text-green-200">Open</a>
                    )}
                    <button onClick={() => removePaperBookmark(paper.id)} className="text-red-300 text-xs hover:text-red-200">Remove</button>
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
            <p className="text-blue-200/50 text-sm text-center py-8">No saved searches yet. Click the Save button on any search result.</p>
          ) : (
            bookmarks.searches.map((search, i) => (
              <div key={i} className="p-3 bg-black/30 rounded-lg border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-3">
                    <div className="text-white text-sm font-medium">{search.query}</div>
                    {search.answer && <div className="text-blue-200/60 text-xs mt-1 line-clamp-2">{search.answer}</div>}
                  </div>
                  <button onClick={() => removeSearchBookmark(i)} className="text-red-300 text-xs hover:text-red-200 flex-shrink-0">Remove</button>
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
              className="flex-1 px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-sm text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleCreateList}
              disabled={!newListName.trim()}
              className="px-4 py-2 bg-purple-500/30 text-purple-200 rounded-lg text-sm font-medium hover:bg-purple-500/40 disabled:opacity-50 transition-colors"
            >
              Create
            </button>
          </div>

          {bookmarks.readingLists.length === 0 ? (
            <p className="text-blue-200/50 text-sm text-center py-4">No reading lists yet. Create one above.</p>
          ) : (
            bookmarks.readingLists.map(list => (
              <div key={list.id} className="bg-black/30 rounded-lg border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">{list.name}</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-200/50 text-xs">{list.papers.length} papers</span>
                    {list.papers.length > 0 && (
                      <button onClick={() => exportToCSV(list.papers)} className="text-xs text-purple-300 hover:text-purple-200">Export</button>
                    )}
                    <button onClick={() => deleteReadingList(list.id)} className="text-red-300 text-xs hover:text-red-200">Delete</button>
                  </div>
                </div>
                {list.papers.length > 0 && (
                  <div className="space-y-1">
                    {list.papers.map(paper => (
                      <div key={paper.id} className="flex items-center justify-between text-sm p-1.5 bg-black/20 rounded">
                        <span className="text-blue-200/70 line-clamp-1 flex-1">{paper.title}</span>
                        <button
                          onClick={() => removeFromReadingList(list.id, paper.id)}
                          className="text-red-300/70 text-xs hover:text-red-200 ml-2"
                        >
                          {'\u2715'}
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
