// notes.js
import { getSupabase, checkAuthState } from './auth.js';

// Supabase functions
export async function saveNoteToSupabase(note) {
    try {
        const supabase = await getSupabase();
        const user = await checkAuthState();

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

export async function getNotesFromSupabase() {
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

export async function deleteNoteFromSupabase(noteId) {
    if (!confirm('Are you sure you want to permanently delete this note?')) {
        return false;
    }
    
    try {
        const supabase = await getSupabase();
        const user = await checkAuthState();

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

export async function updateNoteInSupabase(noteId, updatedData) {
    try {
        const supabase = await getSupabase();
        const user = await checkAuthState();

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

export async function archiveNote(noteId) {
    if (!confirm('Are you sure you want to archive this note?')) {
        return;
    }

    try {
        const supabase = await getSupabase();
        const user = await checkAuthState();

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

export async function restoreNote(noteId) {
    if (!confirm('Are you sure you want to restore this note?')) {
        return;
    }

    try {
        const supabase = await getSupabase();
        const user = await checkAuthState();

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
        displayArchivedNotes();
        displayNotes();
        updateTagCloud();
    } catch (error) {
        console.error('Error restoring note:', error);
        alert('Error restoring note: ' + error.message);
    }
}

// UI/display functions
export async function displayNotes(tag = 'all', group = 'all', sort = 'created_at_desc') {
    const notesGrid = document.getElementById('notesGrid');
    notesGrid.innerHTML = '';
    
    const supabase = await getSupabase();
    const user = await checkAuthState();

    let notes = [];
    let query = supabase.from('notes').select('*');
    
    if (user) {
        query = query.eq('user_id', user.id);
    } else {
        query = query.eq('hidden', false);
    }

    query = query.eq('status', 'active');

    if (tag !== 'all') {
        query = query.contains('tags', [tag]);
    }

    if (group !== 'all') {
        query = query.eq('group', group);
    }
    
    if (sort === 'created_at_desc') {
        query = query.order('created_at', { ascending: false });
    } else if (sort === 'created_at_asc') {
        query = query.order('created_at', { ascending: true });
    } else if (sort === 'priority_desc') {
        query = query.order('priority', { ascending: false });
    } else if (sort === 'priority_asc') {
        query = query.order('priority', { ascending: true });
    } else if (sort === 'title_asc') {
        query = query.order('title', { ascending: true });
    } else if (sort === 'title_desc') {
        query = query.order('title', { ascending: false });
    }

    const { data, error } = await query;

    if (error) console.error(error);
    notes = data || [];
    
    notes.forEach(note => {
        const noteElement = createNoteElement(note);
        notesGrid.prepend(noteElement);
    });
}

export async function displayArchivedNotes() {
    const archivedNotesGrid = document.getElementById('archivedNotesGrid');
    archivedNotesGrid.innerHTML = '';

    const supabase = await getSupabase();
    const user = await checkAuthState();

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

export function clearNoteForm() {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteLink').value = '';
    document.getElementById('noteTags').value = '';
    document.getElementById('noteGroup').value = '';
    document.getElementById('notePriority').value = 'medium';
    document.getElementById('noteHidden').checked = false;
    
    document.getElementById('saveNoteBtn').textContent = 'Save Idea';
    window.editingNoteId = null;
    clearImagePreview();
}

export async function deleteNote(noteId) {
    if (confirm('Are you sure you want to delete this note?')) {
        const success = await deleteNoteFromSupabase(noteId);
        if (success) {
            displayNotes();
            updateTagCloud();
        }
    }
}

export async function editNote(noteId) {
    const supabase = await getSupabase();
    const user = await checkAuthState();

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

export async function handleImageUpload(event) {
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

export async function updateTagCloud() {
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

export async function filterNotesByTag(tag) {
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

export function clearFilter() {
    document.getElementById('clearFilterBtn').classList.add('hidden');

    document.querySelectorAll('.tag-cloud .tag').forEach(el => {
        el.classList.remove('active');
    });

    displayNotes();
}

export async function getUniqueGroups() {
    try {
        const supabase = await getSupabase();
        const user = await checkAuthState();

        if (!user) return [];

        const { data, error } = await supabase
            .from('notes')
            .select('group')
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        const groups = new Set(data.map(item => item.group).filter(group => group !== 'none' && group !== null));
        return Array.from(groups).sort();
    } catch (error) {
        console.error('Error fetching unique groups:', error);
        return [];
    }
}

export async function renderGroupLinks() {
    const notesGroupsSubnav = document.getElementById('notesGroupsSubnav');
    const groups = await getUniqueGroups();

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

export async function renderGroupDatalist() {
    const groupOptionsDatalist = document.getElementById('groupOptions');
    const groups = await getUniqueGroups();

    groupOptionsDatalist.innerHTML = '';
    const noneOption = document.createElement('option');
    noneOption.value = 'none';
    groupOptionsDatalist.appendChild(noneOption);

    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        groupOptionsDatalist.appendChild(option);
    });
}

export async function updateGroupFilterCloud() {
    const groupFilterCloud = document.getElementById('groupFilterCloud');
    const groups = await getUniqueGroups();

    groupFilterCloud.innerHTML = '<span class="tag active" data-group-filter="all">All</span>';

    groups.forEach(group => {
        const groupTag = document.createElement('span');
        groupTag.className = 'tag';
        groupTag.textContent = group;
        groupTag.dataset.groupFilter = group;
        groupFilterCloud.appendChild(groupTag);
    });
}