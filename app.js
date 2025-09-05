// ===== SUPABASE SETUP =====
let supabase = null;

function initializeSupabase() {
    try {
        const SUPABASE_URL = 'https://fdwxcunlytbhdnnjzgua.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkd3hjdW5seXRiaGRubmp6Z3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTQ3MjksImV4cCI6MjA3MTg3MDcyOX0.WqQROmzPJcfzZVoRTW2MFjryulKvw7IWGHKnaphCEcU';
        
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase initialized successfully!');
            return true;
        } else {
            console.log('Supabase library not loaded yet');
            return false;
        }
    } catch (error) {
        console.error('Supabase initialization failed:', error);
        return false;
    }
}

async function getSupabase() {
    if (!supabase) {
        if (!initializeSupabase()) {
            throw new Error('Supabase failed to initialize');
        }
    }
    return supabase;
}

// ===== AUTHENTICATION FUNCTIONS =====

async function handleSignIn(email, password) {
    try {
        const supabase = await getSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        displayAuthMessage('Signed in successfully!', 'green');
        updateAuthUI(data.user);
    } catch (error) {
        displayAuthMessage(error.message, 'red');
    }
}

async function handleSignUp(email, password) {
    try {
        const supabase = await getSupabase();
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        displayAuthMessage('Sign up successful! Please check your email for a confirmation link.', 'green');
        updateAuthUI(data.user);
    } catch (error) {
        displayAuthMessage(error.message, 'red');
    }
}

async function handleSignOut() {
    try {
        const supabase = await getSupabase();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        displayAuthMessage('Signed out successfully!', 'green');
        updateAuthUI(null);
    } catch (error) {
        displayAuthMessage(error.message, 'red');
    }
}

function displayAuthMessage(message, color) {
    const authMessage = document.getElementById('authMessage');
    authMessage.textContent = message;
    authMessage.style.color = color;
}

function updateAuthUI(user) {
    const authForm = document.getElementById('authForm');
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');
    
    if (user) {
        authForm.style.display = 'none';
        userInfo.style.display = 'flex';
        userEmail.textContent = user.email;
    } else {
        authForm.style.display = 'flex';
        userInfo.style.display = 'none';
    }
}

async function checkAuthState() {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    updateAuthUI(user);
    // Call these functions here to ensure they run after the user is authenticated
    await renderGroupLinks();
    await displayNotes();
}

// ===== SUPABASE FUNCTIONS =====

async function saveNoteToSupabase(note) {
    try {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert('Please sign in to save notes.');
            return null;
        }

        const tagsArray = Array.isArray(note.tags) 
            ? note.tags 
            : note.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

        const { data, error } = await supabase
            .from('notes')
            .insert([{
                title: note.title,
                content: note.content,
                type: note.type,
                tags: tagsArray,
                group: note.group,
                priority: note.priority,
                hidden: note.hidden,
                user_id: user.id
            }])
            .select();

        if (error) throw error;
        
        console.log('Note saved to Supabase:', data);
        return data[0];
    } catch (error) {
        console.error('Error saving note to Supabase:', error);
        alert('Error saving note: ' + error.message);
        return null;
    }
}

async function getNotesFromSupabase() {
    try {
        const supabase = await getSupabase();
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error fetching notes from Supabase:', error);
        return [];
    }
}

async function deleteNoteFromSupabase(noteId) {
    if (!confirm('Are you sure you want to permanently delete this note?')) {
        return false;
    }
    
    try {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert('Please sign in to delete notes.');
            return false;
        }

        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId)
            .eq('user_id', user.id);

        if (error) throw error;
        
        console.log(`Note with ID ${noteId} deleted successfully.`);
        return true;
    } catch (error) {
        console.error('Error deleting note from Supabase:', error);
        alert('Error deleting note: ' + error.message);
        return false;
    }
}

async function updateNoteInSupabase(noteId, updatedData) {
    try {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert('Please sign in to update notes.');
            return null;
        }

        const tagsArray = Array.isArray(updatedData.tags) 
            ? updatedData.tags 
            : updatedData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

        const { data, error } = await supabase
            .from('notes')
            .update({
                title: updatedData.title,
                content: updatedData.content,
                type: updatedData.type,
                tags: tagsArray,
                group: updatedData.group,
                priority: updatedData.priority,
                hidden: updatedData.hidden
            })
            .eq('id', noteId)
            .eq('user_id', user.id)
            .select();

        if (error) throw error;
        
        console.log('Note updated successfully:', data);
        return data[0];
    } catch (error) {
        console.error('Error updating note:', error);
        alert('Error updating note: ' + error.message);
        return null;
    }
}

async function archiveNote(noteId) {
    if (!confirm('Are you sure you want to archive this note?')) {
        return;
    }

    try {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert('Please sign in to archive notes.');
            return;
        }

        const { error } = await supabase
            .from('notes')
            .update({ status: 'archived' })
            .eq('id', noteId)
            .eq('user_id', user.id);

        if (error) throw error;

        console.log(`Note with ID ${noteId} archived successfully.`);
        displayNotes();
        updateTagCloud();
    } catch (error) {
        console.error('Error archiving note:', error);
        alert('Error archiving note: ' + error.message);
    }
}

async function restoreNote(noteId) {
    if (!confirm('Are you sure you want to restore this note?')) {
        return;
    }

    try {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert('Please sign in to restore notes.');
            return;
        }

        const { error } = await supabase
            .from('notes')
            .update({ status: 'active' })
            .eq('id', noteId)
            .eq('user_id', user.id);

        if (error) throw error;

        console.log(`Note with ID ${noteId} restored successfully.`);
        // Refresh both views
        displayArchivedNotes();
        displayNotes();
        updateTagCloud();
    } catch (error) {
        console.error('Error restoring note:', error);
        alert('Error restoring note: ' + error.message);
    }
}

// Function to display active notes
async function displayNotes(group = 'all') {
    const notesGrid = document.getElementById('notesGrid');
    notesGrid.innerHTML = '';
    
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    let notes = [];
    let query = supabase.from('notes').select('*');
    
    if (user) {
        query = query.eq('user_id', user.id);
    } else {
        query = query.eq('hidden', false);
    }

    query = query.eq('status', 'active');

    // Add group filter if a specific group is selected
    if (group !== 'all') {
        query = query.eq('group', group);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) console.error(error);
    notes = data || [];
    
    notes.forEach(note => {
        const noteElement = createNoteElement(note);
        notesGrid.prepend(noteElement);
    });
}

// Function to display archived notes
async function displayArchivedNotes() {
    const archivedNotesGrid = document.getElementById('archivedNotesGrid');
    archivedNotesGrid.innerHTML = '';

    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        archivedNotesGrid.innerHTML = '<p>Please sign in to view your archived notes.</p>';
        return;
    }
    
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'archived')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching archived notes:', error);
        return;
    }

    const archivedNotes = data || [];
    archivedNotes.forEach(note => {
        const noteElement = createArchivedNoteElement(note);
        archivedNotesGrid.prepend(noteElement);
    });
}

function createNoteElement(note) {
    const noteDate = new Date(note.created_at).toLocaleDateString();

    const noteElement = document.createElement('div');
    noteElement.className = `note-card priority-${note.priority}`;
    noteElement.dataset.id = note.id;

    const tagsHtml = note.tags && Array.isArray(note.tags) 
        ? note.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('') 
        : '';
        
    const groupLabelHtml = note.group && note.group !== 'none' ? `<span class="label group-label">${escapeHTML(note.group)}</span>` : '';
    const hiddenLabelHtml = note.hidden ? `<span class="label hidden-label">Hidden</span>` : '';

    noteElement.innerHTML = `
    <div class="note-header">
        <div class="note-title">${escapeHTML(note.title)}</div>
        <div class="note-date">${noteDate}</div>
    </div>
    <div class="note-content">${escapeHTML(note.content)}</div>
    <div class="note-tags">${tagsHtml}</div>
    <div class="note-meta">${groupLabelHtml}${hiddenLabelHtml}</div>
    <div class="note-actions">
    <button class="btn-edit" onclick="editNote('${note.id}')">Edit</button>
    <button class="btn-archive" onclick="archiveNote('${note.id}')">Archive</button>
    <button class="btn-delete" onclick="deleteNote('${note.id}')">Delete</button>
</div>
    `;

    return noteElement;
}

function createArchivedNoteElement(note) {
    const noteDate = new Date(note.created_at).toLocaleDateString();

    const noteElement = document.createElement('div');
    noteElement.className = `note-card priority-${note.priority}`;
    noteElement.dataset.id = note.id;

    const tagsHtml = note.tags && Array.isArray(note.tags) 
        ? note.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('') 
        : '';
        
    const groupLabelHtml = note.group && note.group !== 'none' ? `<span class="label group-label">${escapeHTML(note.group)}</span>` : '';
    const hiddenLabelHtml = note.hidden ? `<span class="label hidden-label">Hidden</span>` : '';

    noteElement.innerHTML = `
    <div class="note-header">
        <div class="note-title">${escapeHTML(note.title)}</div>
        <div class="note-date">${noteDate}</div>
    </div>
    <div class="note-content">${escapeHTML(note.content)}</div>
    <div class="note-tags">${tagsHtml}</div>
    <div class="note-meta">${groupLabelHtml}${hiddenLabelHtml}</div>
    <div class="note-actions">
        <button class="btn-restore" onclick="restoreNote('${note.id}')">Restore</button>
        <button class="btn-delete" onclick="deleteNoteFromSupabase('${note.id}')">Delete Permanently</button>
    </div>
    `;

    return noteElement;
}

function escapeHTML(text) {
    if (!text) return '';
    return text.toString().replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

// ===== EVENT HANDLERS =====
async function deleteNote(noteId) {
    if (confirm('Are you sure you want to delete this note?')) {
        const success = await deleteNoteFromSupabase(noteId);
        if (success) {
            displayNotes();
            updateTagCloud();
        }
    }
}

async function editNote(noteId) {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        alert('Please sign in to edit notes.');
        return;
    }

    const { data: note, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

    if (error) {
        console.error('Error fetching note for editing:', error);
        return;
    }

    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content;
    document.getElementById('noteTags').value = note.tags.join(', ');
    document.getElementById('noteGroup').value = note.group;
    document.getElementById('notePriority').value = note.priority;
    document.getElementById('noteHidden').checked = note.hidden;
    
    window.editingNoteId = note.id;
    document.getElementById('saveNoteBtn').textContent = 'Update Note';

    const currentType = note.type;
    const contentTypes = document.querySelectorAll('.content-type');
    contentTypes.forEach(type => {
        type.classList.remove('active');
        const inputGroup = document.getElementById(type.getAttribute('data-type') + 'NoteGroup');
        inputGroup.classList.add('hidden');
        if (type.getAttribute('data-type') === currentType) {
            type.classList.add('active');
            inputGroup.classList.remove('hidden');
        }
    });

    if (currentType === 'image' || currentType === 'audio') {
        alert('File upload/display not yet supported for editing.');
    }
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showImagePreview(file);
    
    const progressDiv = document.getElementById('uploadProgress');
    progressDiv.classList.remove('hidden');
    
    try {
        const supabase = await getSupabase();
        const { data, error } = await supabase.storage
            .from('note-images')
            .upload(`images/${Date.now()}_${file.name}`, file, {
                onProgress: (evt) => {
                    const progressFill = document.querySelector('#uploadProgress .progress-fill');
                    const progressPercentage = Math.round((evt.loaded / evt.total) * 100);
                    progressFill.style.width = `${progressPercentage}%`;
                }
            });
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
            .from('note-images')
            .getPublicUrl(data.path);
        
        window.currentImageUrl = urlData.publicUrl;
        
        progressDiv.classList.add('hidden');
        alert('Image uploaded successfully! Click "Save Idea" to save the note.');
        
    } catch (error) {
        console.error('Upload error:', error);
        progressDiv.classList.add('hidden');
        alert('Error uploading image: ' + error.message);
    }
}

function showImagePreview(file) {
    const previewDiv = document.getElementById('imagePreview');
    previewDiv.classList.remove('hidden');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        previewDiv.innerHTML = `<img src="${e.target.result}" alt="Image preview">`;
    };
    reader.readAsDataURL(file);
}

function clearImagePreview() {
    const previewDiv = document.getElementById('imagePreview');
    previewDiv.classList.add('hidden');
    previewDiv.innerHTML = '';
    
    const progressDiv = document.getElementById('uploadProgress');
    progressDiv.classList.add('hidden');
    
    document.getElementById('noteImage').value = '';
    window.currentImageUrl = null;
}

// ===== TAG FILTERING FUNCTIONS =====
async function updateTagCloud() {
    const tagCloud = document.getElementById('tagCloud');
    const notes = await getNotesFromSupabase();

    const allTags = new Set();
    notes.forEach(note => {
        if (Array.isArray(note.tags)) {
            note.tags.forEach(tag => allTags.add(tag));
        }
    });

    tagCloud.innerHTML = '';
    const sortedTags = Array.from(allTags).sort();
    sortedTags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagElement.onclick = () => filterNotesByTag(tag);
        tagCloud.appendChild(tagElement);
    });
}

async function filterNotesByTag(tag) {
    document.getElementById('clearFilterBtn').classList.remove('hidden');

    const notes = await getNotesFromSupabase();
    const filteredNotes = notes.filter(note => note.tags.includes(tag));
    displayFilteredNotes(filteredNotes);

    document.querySelectorAll('.tag-cloud .tag').forEach(el => {
        el.classList.toggle('active', el.textContent === tag);
    });
}

function displayFilteredNotes(notes) {
    const notesGrid = document.getElementById('notesGrid');
    notesGrid.innerHTML = '';

    notes.forEach(note => {
        const noteElement = createNoteElement(note);
        notesGrid.appendChild(noteElement);
    });
}

// Function to get all unique groups from notes
async function getUniqueGroups() {
    try {
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return [];

        const { data, error } = await supabase
            .from('notes')
            .select('group')
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        const groups = new Set(data.map(item => item.group).filter(group => group !== 'none'));
        return Array.from(groups).sort();
    } catch (error) {
        console.error('Error fetching unique groups:', error);
        return [];
    }
}

// Function to dynamically render group links in the sidebar
async function renderGroupLinks() {
    const notesGroupsSubnav = document.getElementById('notesGroupsSubnav');
    const groups = await getUniqueGroups();

    // Clear existing dynamic links, but keep "All Notes"
    notesGroupsSubnav.innerHTML = '<a href="#" class="nav-sub-item active" data-group="all">All Notes</a>';

    groups.forEach(group => {
        const groupLink = document.createElement('a');
        groupLink.href = '#';
        groupLink.className = 'nav-sub-item';
        groupLink.textContent = group.charAt(0).toUpperCase() + group.slice(1);
        groupLink.dataset.group = group;
        notesGroupsSubnav.appendChild(groupLink);
    });
}

function clearFilter() {
    document.getElementById('clearFilterBtn').classList.add('hidden');

    document.querySelectorAll('.tag-cloud .tag').forEach(el => {
        el.classList.remove('active');
    });

    displayNotes();
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Auth and Initialization
    document.getElementById('signInBtn').addEventListener('click', () => {
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        handleSignIn(email, password);
    });

    document.getElementById('signUpBtn').addEventListener('click', () => {
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        handleSignUp(email, password);
    });

    document.getElementById('signOutBtn').addEventListener('click', () => {
        handleSignOut();
    });

    // New event listeners for the sub-navigation
    document.getElementById('notesGroupsSubnav').addEventListener('click', (e) => {
        e.preventDefault();
        const selectedGroup = e.target.getAttribute('data-group');
        if (selectedGroup) {
            document.querySelectorAll('#notesGroupsSubnav .nav-sub-item').forEach(item => item.classList.remove('active'));
            e.target.classList.add('active');
            displayNotes(selectedGroup);
        }
    });

    checkAuthState();

    setTimeout(() => {
        if (initializeSupabase()) {
            console.log('Supabase ready to use');
        } else {
            console.log('Supabase will be initialized when needed');
        }
    }, 1000);

    // Navigation and Page Switching
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');

            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            e.target.classList.add('active');

            document.getElementById('notesPage').classList.remove('active-page');
            document.getElementById('archivePage').classList.remove('active-page');
            document.getElementById('pageTitle').textContent = e.target.textContent;

            if (page === 'notes') {
                document.getElementById('notesPage').classList.add('active-page');
                displayNotes();
            } else if (page === 'archive') {
                document.getElementById('archivePage').classList.add('active-page');
                displayArchivedNotes();
            }
        });
    });

    // Note Form and other event listeners
    const contentTypes = document.querySelectorAll('.content-type');
    const inputGroups = {
        text: document.getElementById('textNoteGroup'),
        link: document.getElementById('linkNoteGroup'), 
        image: document.getElementById('imageNoteGroup'),
        audio: document.getElementById('audioNoteGroup')
    };

    contentTypes.forEach(type => {
        type.addEventListener('click', () => {
            contentTypes.forEach(t => t.classList.remove('active'));
            type.classList.add('active');
            
            const selectedType = type.getAttribute('data-type');
            Object.keys(inputGroups).forEach(key => {
                inputGroups[key].classList.toggle('hidden', key !== selectedType);
            });
            
            if (selectedType !== 'image') {
                clearImagePreview();
            }
        });
    });

    document.getElementById('clearFilterBtn').addEventListener('click', clearFilter);
    document.getElementById('noteImage').addEventListener('change', handleImageUpload);
    
    document.getElementById('saveNoteBtn').addEventListener('click', async function() {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        const linkUrl = document.getElementById('noteLink').value.trim();
        const tags = document.getElementById('noteTags').value.trim();
        const group = document.getElementById('noteGroup').value;
        const priority = document.getElementById('notePriority').value;
        const isHidden = document.getElementById('noteHidden').checked;
        const currentType = document.querySelector('.content-type.active').getAttribute('data-type');
        
        if (title) {
            let noteData = { 
                title, 
                tags: tags,
                group: group,
                priority: priority,
                hidden: isHidden,
            };
            
            if (currentType === 'text' && content) {
                noteData.type = 'text';
                noteData.content = content;
            } else if (currentType === 'link' && linkUrl) {
                noteData.type = 'link';
                noteData.content = linkUrl;
            } else if (currentType === 'image' && window.currentImageUrl) {
                noteData.type = 'image';
                noteData.content = window.currentImageUrl;
            } else if (currentType === 'audio') {
                noteData.type = 'audio';
                noteData.content = 'Audio recording';
            } else {
                alert('Please add content for your note');
                return;
            }
            
            let savedNote;
            if (window.editingNoteId) {
                savedNote = await updateNoteInSupabase(window.editingNoteId, noteData);
            } else {
                savedNote = await saveNoteToSupabase(noteData);
            }
            
            if (savedNote) {
                document.getElementById('noteTitle').value = '';
                document.getElementById('noteContent').value = '';
                document.getElementById('noteLink').value = '';
                document.getElementById('noteTags').value = '';
                document.getElementById('noteGroup').value = 'none';
                document.getElementById('notePriority').value = 'medium';
                document.getElementById('noteHidden').checked = false;
                
                document.getElementById('saveNoteBtn').textContent = 'Save Idea';
                window.editingNoteId = null;
                
                clearImagePreview();
                displayNotes();
                updateTagCloud();
                
                alert('Note saved successfully!');
            }
        } else {
            alert('Please add a title for your note');
        }
    });

    // Initial load
    displayNotes();
    updateTagCloud();
});