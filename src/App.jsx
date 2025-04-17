import React, { createContext, useContext, useEffect, useState } from 'react';

// -------------------
// 1. Context for Data Management
// -------------------
const DataContext = createContext();

// Provider component to wrap the app and manage data
function DataProvider({ children }) {
  const [books, setBooks] = useState([]);
  const [characters, setCharacters] = useState([]);

  // Load data from local storage on initial render
  useEffect(() => {
    const storedBooks = localStorage.getItem('books');
    const storedCharacters = localStorage.getItem('characters');
    try {
        // Initialize with empty arrays if nothing is stored or data is invalid
        if (storedBooks) {
            const parsedBooks = JSON.parse(storedBooks);
            setBooks(Array.isArray(parsedBooks) ? parsedBooks : []);
        } else {
            setBooks([]);
        }
        if (storedCharacters) {
             const parsedChars = JSON.parse(storedCharacters);
            setCharacters(Array.isArray(parsedChars) ? parsedChars : []);
        } else {
            setCharacters([]);
        }
    } catch (error) {
        console.error("Error parsing localStorage data:", error);
        setBooks([]); // Reset to empty array on error
        setCharacters([]);
        // Optionally clear corrupted data
        // localStorage.removeItem('books');
        // localStorage.removeItem('characters');
    }
  }, []);

  // Save book data to local storage whenever it changes
  useEffect(() => {
     // Add basic validation before saving
     if (Array.isArray(books)) {
        localStorage.setItem('books', JSON.stringify(books));
     }
  }, [books]);

  // Save character data to local storage whenever it changes
  useEffect(() => {
     if (Array.isArray(characters)) {
        localStorage.setItem('characters', JSON.stringify(characters));
     }
  }, [characters]);

  // --- Book Functions ---
  const addBook = (book) => {
    // Ensure prevBooks is an array before spreading
    setBooks(prevBooks => Array.isArray(prevBooks) ? [...prevBooks, { ...book, id: Date.now() }] : [{ ...book, id: Date.now() }]);
  };

  const updateBook = (updatedBook) => {
    setBooks(prevBooks => Array.isArray(prevBooks) ? prevBooks.map(book => book.id === updatedBook.id ? updatedBook : book) : []);
  };

  const deleteBook = (id) => {
    setBooks(prevBooks => Array.isArray(prevBooks) ? prevBooks.filter(book => book.id !== id) : []);
    // Also delete associated characters
    setCharacters(prevChars => Array.isArray(prevChars) ? prevChars.filter(char => char.bookId !== id) : []);
  };

  // --- Character Functions ---
  // No changes needed here as add/update spread the character object,
  // implicitly handling new fields passed from the form.
  const addCharacter = (character) => {
    setCharacters(prevChars => Array.isArray(prevChars) ? [...prevChars, { ...character, id: Date.now() }] : [{ ...character, id: Date.now() }]);
  };

   const updateCharacter = (updatedCharacter) => {
    setCharacters(prevChars => Array.isArray(prevChars) ? prevChars.map(char => char.id === updatedCharacter.id ? updatedCharacter : char) : []);
  };

  const deleteCharacter = (id) => {
    setCharacters(prevChars => Array.isArray(prevChars) ? prevChars.filter(char => char.id !== id) : []);
  };

  // Provide state and functions through context
  return (
    <DataContext.Provider value={{
      books, addBook, updateBook, deleteBook,
      characters, addCharacter, updateCharacter, deleteCharacter
    }}>
      {children}
    </DataContext.Provider>
  );
}

// Custom hook to easily access data context
function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    // This error should not happen if App is wrapped in DataProvider correctly
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}


// -------------------
// 2. Book Components
// -------------------

// --- Book List ---
// No changes needed here
function BookList({ navigate, filterStatus = null, listTitle = "My Books" }) {
  const { books, deleteBook } = useData();

  // Ensure books is an array before filtering
  const safeBooks = Array.isArray(books) ? books : [];

  // Filter books based on the filterStatus prop if provided
  const filteredBooks = filterStatus
    ? safeBooks.filter(book => book.readStatus === filterStatus)
    : safeBooks;

  // Determine appropriate empty state message based on filter
  const getEmptyMessage = () => {
    if (filterStatus === "To Read") return "Your wishlist is empty. Add books with the status 'To Read'.";
    if (filterStatus === "Read") return "You haven't marked any books as 'Read' yet.";
    return "The library is empty. Add a tome to begin!";
  };

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold text-purple-300">{listTitle} ({filteredBooks.length})</h2>
      {filteredBooks.length === 0 ? (
        <p className="text-gray-400">{getEmptyMessage()}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {filteredBooks.map(book => (
            <div key={book.id} className="flex flex-col justify-between rounded-lg border border-slate-600 bg-slate-700 p-4 shadow-md transition-all duration-200 hover:bg-slate-600 hover:shadow-lg">
              <div>
                <img
                    src={book.coverImage || 'https://placehold.co/200x300/2d3748/a0aec0?text=No+Cover'}
                    alt={`Cover for ${book.title}`}
                    className="mb-3 h-48 w-full rounded bg-slate-800 object-contain"
                    onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x300/7f1d1d/fecaca?text=Invalid+URL'; }}
                />
                <h3 className="truncate text-lg font-semibold text-gray-100" title={book.title}>{book.title}</h3>
                <p className="mb-2 text-sm text-gray-400">{book.author}</p>
                {book.readStatus && <span className={`rounded-full px-2 py-0.5 text-xs ${
                    book.readStatus === 'Read' ? 'bg-emerald-900 text-emerald-200' :
                    book.readStatus === 'To Read' ? 'bg-sky-900 text-sky-200' :
                    book.readStatus === 'Reading' ? 'bg-yellow-900 text-yellow-200' :
                    'bg-gray-700 text-gray-300' // Default/other statuses
                }`}>{book.readStatus}</span>}
              </div>
              <div className="mt-4 flex items-center justify-between space-x-2">
                <button
                  onClick={() => navigate('viewBook', book.id)}
                  className="rounded bg-indigo-600 px-3 py-1 text-sm text-white shadow transition duration-150 hover:bg-indigo-500"
                >
                  View Details
                </button>
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Consign "${book.title}" and all its characters to oblivion?`)) {
                            deleteBook(book.id);
                        }
                    }}
                    className="rounded bg-rose-700 px-3 py-1 text-sm text-white shadow transition duration-150 hover:bg-rose-600"
                >
                    Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Book Detail ---
// No changes needed here
function BookDetail({ book, characters, navigate }) {
 const { deleteBook } = useData();

 // Ensure characters is always an array for filtering/length check
 const safeCharacters = Array.isArray(characters) ? characters : [];

  const handleDeleteBook = () => {
    if (window.confirm(`Consign "${book.title}" and its ${safeCharacters.length} character(s) to oblivion? This cannot be undone.`)) {
      deleteBook(book.id);
      navigate('books');
    }
  };

  // Handle case where book might become undefined temporarily after delete/navigation
  if (!book) {
      return <p className="text-gray-400">Book not found.</p>; // Or a loading indicator
  }

  return (
    <div>
      <button onClick={() => navigate('books')} className="mb-4 text-sm text-purple-400 hover:text-purple-300 hover:underline">&larr; Back to Library</button>
      <div className="mb-6 flex flex-col gap-6 md:flex-row">
          <img
            src={book.coverImage || 'https://placehold.co/300x450/2d3748/a0aec0?text=No+Cover'}
            alt={`Cover for ${book.title}`}
            className="h-auto w-full rounded-lg bg-slate-700 object-contain shadow-md md:w-1/3"
            onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/300x450/7f1d1d/fecaca?text=Invalid+URL'; }}
          />
          <div className="md:w-2/3">
            <h2 className="text-3xl font-bold text-purple-200">{book.title}</h2>
            <p className="mb-2 text-xl text-gray-400">by {book.author}</p>
            {book.readStatus && <p className="mb-4 text-sm text-gray-400">Status: <span className={`font-semibold ${
                 book.readStatus === 'Read' ? 'text-emerald-300' :
                 book.readStatus === 'To Read' ? 'text-sky-300' :
                 book.readStatus === 'Reading' ? 'text-yellow-300' :
                 'text-gray-200'
            }`}>{book.readStatus}</span></p>}
             <div className="mb-4 mt-2 space-x-2">
               <button
                 onClick={() => navigate('editBook', book.id)}
                 className="rounded bg-amber-600 px-3 py-1 text-sm text-white shadow transition duration-150 hover:bg-amber-500"
               >
                 Edit Book Info
               </button>
                <button
                    onClick={handleDeleteBook}
                    className="rounded bg-rose-700 px-3 py-1 text-sm text-white shadow transition duration-150 hover:bg-rose-600"
                >
                    Delete Book
                </button>
             </div>
            {/* Use optional chaining for safety */}
            {book.notes && (
                <div className="mt-4 rounded border border-slate-600 bg-slate-700 p-3">
                    <h4 className="mb-1 font-semibold text-gray-300">Notes/Summary:</h4>
                    <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-gray-300">{book.notes}</div>
                </div>
            )}
          </div>
      </div>

      <div className="mt-6 border-t border-slate-700 pt-6">
        <div className="mb-4 flex items-center justify-between">
           <h3 className="text-2xl font-semibold text-purple-300">Characters in this Book ({safeCharacters.length})</h3>
           <button
             onClick={() => navigate('addCharacter', book.id)}
             className="rounded-lg border border-teal-500 bg-teal-700 px-4 py-2 text-sm text-white shadow transition duration-200 hover:bg-teal-600"
           >
             + Add Character
           </button>
        </div>
        {safeCharacters.length === 0 ? (
          <p className="text-gray-400">No characters dwell within this tome yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {safeCharacters.map(char => (
              // CharacterCard component is defined below in this file
              <CharacterCard key={char.id} character={char} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Book Form ---
// No changes needed here
function BookForm({ navigate, existingBook = null }) {
  const { addBook, updateBook } = useData();
  const [title, setTitle] = useState(existingBook?.title || '');
  const [author, setAuthor] = useState(existingBook?.author || '');
  const [coverImage, setCoverImage] = useState(existingBook?.coverImage || '');
  const [readStatus, setReadStatus] = useState(existingBook?.readStatus || '');
  const [notes, setNotes] = useState(existingBook?.notes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !author) {
        alert('A book requires at least a Title and Author.');
        return;
    }
    const bookData = { id: existingBook?.id, title, author, coverImage, readStatus, notes };

    if (existingBook) {
        updateBook(bookData);
        navigate('viewBook', existingBook.id);
    } else {
        addBook(bookData);
        navigate('books');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       <h2 className="mb-4 text-2xl font-semibold text-purple-300">{existingBook ? 'Edit Book' : 'Add New Book'}</h2>
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-300">Title <span className="text-red-400">*</span></label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-gray-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="author" className="block text-sm font-medium text-gray-300">Author <span className="text-red-400">*</span></label>
        <input
          type="text"
          id="author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-gray-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="coverImage" className="block text-sm font-medium text-gray-300">Cover Image URL</label>
        <input
          type="url"
          id="coverImage"
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-gray-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
        />
         {coverImage && <img src={coverImage} alt="Cover preview" className="mt-2 h-24 w-auto rounded border border-slate-600" onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.style.display='block'}/>}
      </div>
       <div>
        <label htmlFor="readStatus" className="block text-sm font-medium text-gray-300">Read Status</label>
        <select
            id="readStatus"
            value={readStatus}
            onChange={(e) => setReadStatus(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-gray-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
        >
            <option value="">Select Status</option>
            <option value="To Read">To Read (Wishlist)</option>
            <option value="Reading">Reading</option>
            <option value="Read">Read</option>
            <option value="On Hold">On Hold</option>
            <option value="Did Not Finish">Did Not Finish</option>
        </select>
       </div>
        <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-300">Notes / Summary</label>
            <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="4"
                className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-gray-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
                placeholder="Scribe your thoughts or summary here..."
            ></textarea>
        </div>

      <div className="flex justify-end space-x-3">
         <button
            type="button"
            onClick={() => navigate(existingBook ? 'viewBook' : 'books', existingBook?.id)}
            className="rounded-md border border-slate-500 bg-slate-600 px-4 py-2 text-sm font-medium text-gray-300 shadow-sm hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            Cancel
          </button>
        <button
          type="submit"
          className="rounded-md border border-purple-500 bg-purple-700 px-4 py-2 text-sm font-medium text-white shadow transition duration-200 hover:bg-purple-600"
        >
          {existingBook ? 'Save Changes' : 'Add Book'}
        </button>
      </div>
    </form>
  );
}

// -------------------
// 3. Character Components (Updated)
// -------------------

// --- Character Card ---
// No changes needed here
function CharacterCard({ character, navigate }) {
    const { deleteCharacter } = useData();

    const handleDelete = (e) => {
        e.stopPropagation(); // Prevent navigation when clicking delete
         if (window.confirm(`Banish character "${character.name}" from this realm?`)) {
            deleteCharacter(character.id);
        }
    };

    // Handle case where character might be undefined
    if (!character) {
        return null; // Or some placeholder/error display
    }

    return (
        <div
          key={character.id}
          className="flex cursor-pointer flex-col rounded-lg border border-slate-600 bg-slate-700 p-3 shadow transition-all duration-200 hover:bg-slate-600 hover:shadow-md"
          onClick={() => navigate('viewCharacter', character.bookId, character.id)}
        >
            <img
                src={character.image || 'https://placehold.co/200x200/2d3748/a0aec0?text=No+Image'}
                alt={`Image of ${character.name}`}
                className="mb-2 h-32 w-full rounded bg-slate-800 object-contain"
                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/7f1d1d/fecaca?text=Invalid+URL'; }}
            />
            <h4 className="text-md flex-grow truncate font-semibold text-gray-100" title={character.name}>{character.name}</h4>
             <div className="mt-2 flex justify-end">
                 <button
                    onClick={handleDelete}
                    className="rounded bg-rose-700 px-2 py-0.5 text-xs text-white shadow transition duration-150 hover:bg-rose-600"
                >
                    Delete
                </button>
             </div>
        </div>
    );
}

// --- Character Detail (Updated to display new fields) ---
function CharacterDetail({ character, navigate }) {
  const { books, deleteCharacter } = useData();

  // Ensure books is an array before finding
  const parentBook = Array.isArray(books) ? books.find(b => b.id === character?.bookId) : null;

   // Handle case where character might become undefined temporarily
   if (!character) {
        return <p className="text-gray-400">Character not found.</p>; // Or a loading indicator
   }

   const handleDeleteCharacter = () => {
    if (window.confirm(`Banish character "${character.name}" from this realm? This cannot be undone.`)) {
      deleteCharacter(character.id);
      // Navigate back to the parent book after deleting a character
      if (character.bookId) {
          navigate('viewBook', character.bookId);
      } else {
          navigate('books'); // Fallback if bookId is missing for some reason
      }
    }
  };

  return (
    <div>
        {parentBook && (
             <button onClick={() => navigate('viewBook', parentBook.id)} className="mb-4 text-sm text-purple-400 hover:text-purple-300 hover:underline">
                &larr; Back to {parentBook.title}
            </button>
        )}
        {/* Add a fallback back button if parentBook isn't found */}
         {!parentBook && (
             <button onClick={() => navigate('books')} className="mb-4 text-sm text-purple-400 hover:text-purple-300 hover:underline">
                &larr; Back to Library
            </button>
        )}


      <div className="flex flex-col gap-6 md:flex-row">
         <img
            src={character.image || 'https://placehold.co/300x300/2d3748/a0aec0?text=No+Image'}
            alt={`Image of ${character.name}`}
            className="h-auto w-full rounded-lg bg-slate-700 object-contain shadow-md md:w-1/3"
            onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/300x300/7f1d1d/fecaca?text=Invalid+URL'; }}
         />
         <div className="md:w-2/3">
            <h2 className="text-3xl font-bold text-teal-300">{character.name}</h2>
            {parentBook && <p className="mb-4 text-lg text-gray-400">From: {parentBook.title}</p>}

             <div className="mb-4 mt-2 space-x-2">
               <button
                 onClick={() => navigate('editCharacter', character.bookId, character.id)}
                 className="rounded bg-amber-600 px-3 py-1 text-sm text-white shadow transition duration-150 hover:bg-amber-500"
               >
                 Edit Character
               </button>
                <button
                    onClick={handleDeleteCharacter}
                    className="rounded bg-rose-700 px-3 py-1 text-sm text-white shadow transition duration-150 hover:bg-rose-600"
                >
                    Delete Character
                </button>
             </div>
         </div>
      </div>

      {/* Display Origin if it exists */}
      {character.origin && (
        <div className="mt-4 rounded border border-indigo-700 bg-indigo-900 bg-opacity-50 p-4">
          <h3 className="mb-2 text-xl font-semibold text-indigo-300">Origin</h3>
           <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-gray-300">{character.origin}</div>
        </div>
      )}

       {/* Display Family if it exists */}
      {character.family && (
        <div className="mt-4 rounded border border-cyan-700 bg-cyan-900 bg-opacity-50 p-4">
          <h3 className="mb-2 text-xl font-semibold text-cyan-300">Family</h3>
           <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-gray-300">{character.family}</div>
        </div>
      )}

      {/* Existing Summary and Backstory */}
      {character.summary && (
        <div className="mt-4 rounded border border-slate-600 bg-slate-700 p-4">
          <h3 className="mb-2 text-xl font-semibold text-purple-300">Summary</h3>
           <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-gray-300">{character.summary}</div>
        </div>
      )}

      {character.backstory && (
        <div className="mt-4 rounded border border-gray-600 bg-gray-700 p-4">
          <h3 className="mb-2 text-xl font-semibold text-teal-300">Backstory</h3>
           <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-gray-300">{character.backstory}</div>
        </div>
      )}
    </div>
  );
}

// --- Character Form (Updated with new fields) ---
function CharacterForm({ navigate, bookId, existingCharacter = null }) {
  const { addCharacter, updateCharacter, books } = useData();
  // Add state for new fields
  const [name, setName] = useState(existingCharacter?.name || '');
  const [image, setImage] = useState(existingCharacter?.image || '');
  const [origin, setOrigin] = useState(existingCharacter?.origin || ''); // New state
  const [family, setFamily] = useState(existingCharacter?.family || ''); // New state
  const [summary, setSummary] = useState(existingCharacter?.summary || '');
  const [backstory, setBackstory] = useState(existingCharacter?.backstory || '');

  // Ensure books is an array before finding
  const parentBook = Array.isArray(books) ? books.find(b => b.id === bookId) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
     if (!name) {
        alert('The character needs a name.');
        return;
    }
    // Ensure bookId is included
    if (!bookId) {
        alert('Cannot add character without a parent book reference.');
        return;
    }
    // Include new fields in the data object
    const characterData = {
        id: existingCharacter?.id,
        name,
        image,
        origin, // Added
        family, // Added
        summary,
        backstory,
        bookId
    };

    if (existingCharacter) {
        updateCharacter(characterData);
        navigate('viewCharacter', bookId, existingCharacter.id);
    } else {
         addCharacter(characterData);
         navigate('viewBook', bookId);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="mb-1 text-2xl font-semibold text-purple-300">
            {existingCharacter ? 'Edit Character' : 'Add New Character'}
        </h2>
        {parentBook && <p className="mb-4 text-sm text-gray-400">For book: <span className="font-medium text-gray-200">{parentBook.title}</span></p>}
        {!parentBook && <p className="mb-4 text-sm text-red-400">Error: Could not find parent book!</p>}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300">Character Name <span className="text-red-400">*</span></label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-gray-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="image" className="block text-sm font-medium text-gray-300">Image URL</label>
        <input
          type="url"
          id="image"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://example.com/character.jpg"
          className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-gray-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
        />
         {image && <img src={image} alt="Character preview" className="mt-2 h-24 w-auto rounded border border-slate-600" onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.style.display='block'}/>}
      </div>

       {/* New Field: Origin */}
       <div>
        <label htmlFor="origin" className="block text-sm font-medium text-gray-300">Origin</label>
        <input
          type="text"
          id="origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="Where the character comes from..."
          className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-gray-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
        />
      </div>

       {/* New Field: Family */}
       <div>
        <label htmlFor="family" className="block text-sm font-medium text-gray-300">Family</label>
        <textarea
          id="family"
          rows="3" // Adjust rows as needed
          value={family}
          onChange={(e) => setFamily(e.target.value)}
           className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-gray-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
           placeholder="Family members, relationships..."
        ></textarea>
      </div>


      {/* Existing Fields: Summary & Backstory */}
      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-gray-300">Summary</label>
        <textarea
          id="summary"
          rows="4"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
           className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-gray-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
           placeholder="A brief description..."
        ></textarea>
      </div>
      <div>
        <label htmlFor="backstory" className="block text-sm font-medium text-gray-300">Backstory</label>
        <textarea
          id="backstory"
          rows="6"
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-gray-100 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
          placeholder="Their history, motivations, secrets..."
        ></textarea>
      </div>
      <div className="flex justify-end space-x-3">
         <button
            type="button"
            onClick={() => navigate(existingCharacter ? 'viewCharacter' : 'viewBook', bookId, existingCharacter?.id)}
             className="rounded-md border border-slate-500 bg-slate-600 px-4 py-2 text-sm font-medium text-gray-300 shadow-sm hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            Cancel
          </button>
        <button
          type="submit"
          // Disable button if parent book isn't found when adding
          disabled={!parentBook && !existingCharacter}
          className={`rounded-md border px-4 py-2 text-sm font-medium text-white shadow transition duration-200 ${
            !parentBook && !existingCharacter
            ? 'cursor-not-allowed border-gray-400 bg-gray-500'
            : 'border-teal-500 bg-teal-700 hover:bg-teal-600'
          }`}
        >
          {existingCharacter ? 'Save Changes' : 'Add Character'}
        </button>
      </div>
    </form>
  );
}


// -------------------
// 4. Main App Component
// -------------------
// No changes needed here
function App() {
  const [view, setView] = useState('books');
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);

  // Get data via context hook
  const { books, characters } = useData();

  // Ensure data arrays are valid before using them
  const safeBooks = Array.isArray(books) ? books : [];
  const safeCharacters = Array.isArray(characters) ? characters : [];

  const selectedBook = safeBooks.find(b => b.id === selectedBookId);
  const selectedCharacter = safeCharacters.find(c => c.id === selectedCharacterId);
  const charactersForSelectedBook = safeCharacters.filter(c => c.bookId === selectedBookId);

  // Navigation function passed down to children
  const navigate = (newView, bookId = null, charId = null) => {
    setView(newView);
    setSelectedBookId(bookId);
    setSelectedCharacterId(charId);
  };

  // Renders the current view based on state
  const renderView = () => {
    switch (view) {
      case 'wishlist':
        return <BookList navigate={navigate} filterStatus="To Read" listTitle="My Wishlist" />;
      case 'readBooks':
        return <BookList navigate={navigate} filterStatus="Read" listTitle="Books Read" />;
      case 'addBook':
        return <BookForm navigate={navigate} />;
      case 'editBook':
        return selectedBook ? <BookForm navigate={navigate} existingBook={selectedBook} /> : <BookList navigate={navigate} listTitle="My Books"/>; // Fallback
      case 'viewBook':
        return selectedBook ? <BookDetail book={selectedBook} characters={charactersForSelectedBook} navigate={navigate} /> : <BookList navigate={navigate} listTitle="My Books"/>; // Fallback
      case 'addCharacter':
        return <CharacterForm navigate={navigate} bookId={selectedBookId} />;
       case 'editCharacter':
         return selectedCharacter ? <CharacterForm navigate={navigate} bookId={selectedBookId} existingCharacter={selectedCharacter} /> : <BookList navigate={navigate} listTitle="My Books"/>; // Fallback
      case 'viewCharacter':
        return selectedCharacter ? <CharacterDetail character={selectedCharacter} navigate={navigate} /> : <BookList navigate={navigate} listTitle="My Books"/>; // Fallback
      case 'books':
      default:
        return <BookList navigate={navigate} listTitle="My Books" />;
    }
  };

  // --- App Structure & Theme ---
  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-gray-900 p-4 font-sans text-gray-200 md:p-8">
        <header className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-wider text-purple-200 md:text-5xl" style={{ fontFamily: "'Cinzel Decorative', cursive" }}>Lane's Book Grimoire</h1>
          <p className="text-lg text-gray-400">Your personal library grimoire</p>
          {/* Navigation Buttons */}
          <nav className="mt-4 flex flex-wrap justify-center gap-3 md:gap-4">
             <button
                onClick={() => navigate('books')}
                className={`rounded-lg border px-4 py-2 shadow-md transition duration-200 ${view === 'books' ? 'border-purple-400 bg-purple-600 text-white ring-2 ring-purple-300' : 'border-purple-500 bg-purple-700 text-white hover:bg-purple-600'}`}
             >
                All Books
             </button>
              <button
                onClick={() => navigate('wishlist')}
                className={`rounded-lg border px-4 py-2 shadow-md transition duration-200 ${view === 'wishlist' ? 'border-sky-400 bg-sky-600 text-white ring-2 ring-sky-300' : 'border-sky-500 bg-sky-700 text-white hover:bg-sky-600'}`}
             >
                Wishlist
             </button>
              <button
                onClick={() => navigate('readBooks')}
                className={`rounded-lg border px-4 py-2 shadow-md transition duration-200 ${view === 'readBooks' ? 'border-emerald-400 bg-emerald-600 text-white ring-2 ring-emerald-300' : 'border-emerald-500 bg-emerald-700 text-white hover:bg-emerald-600'}`}
             >
                Read Books
             </button>
             <button
                onClick={() => navigate('addBook')}
                className={`rounded-lg border px-4 py-2 shadow-md transition duration-200 ${view === 'addBook' ? 'border-teal-400 bg-teal-600 text-white ring-2 ring-teal-300' : 'border-teal-500 bg-teal-700 text-white hover:bg-teal-600'}`}
             >
                Add New Book
             </button>
          </nav>
        </header>
        {/* Main content area where the current view is rendered */}
        <main className="mx-auto max-w-4xl rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg md:p-6">
          {renderView()}
        </main>
        <footer className="mt-8 text-center text-sm text-gray-500">
            <p>Data is stored locally in your browser's arcane depths.</p>
        </footer>
      </div>
  );
}

// -------------------
// 5. Wrapper Component & Default Export
// -------------------

// This component ensures the App is always wrapped in the DataProvider
function WrappedApp() {
  return (
    <DataProvider>
      <App />
    </DataProvider>
  );
}

export default WrappedApp; // Export the wrapped app as the default

