// main.js
import { handleSignIn, handleSignUp, handleSignOut, checkAuthState, updateAuthUI } from './auth.js';
import { 
    displayNotes, 
    updateTagCloud, 
    renderGroupLinks, 
    renderGroupDatalist, 
    updateGroupFilterCloud, 
    handleImageUpload, 
    clearFilter,
    saveNoteToSupabase,
    updateNoteInSupabase
} from './notes.js';
import { displayTasks } from './tasks.js';

document.addEventListener('DOMContentLoaded', async function() {
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

    // Navigation and Page Switching
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            e.target.classList.add('active');

            // Hide all pages
            document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active-page'));
            
            // Show the selected page and update its content
            if (page === 'notes') {
                document.getElementById('notesPage').classList.add('active-page');
                const currentTag = document.querySelector('.tag-cloud .tag.active')?.textContent || 'all';
                const currentGroup = document.querySelector('#notesGroupsSubnav .nav-sub-item.active')?.dataset.group || 'all';
                const currentSort = document.getElementById('sortSelect')?.value || 'created_at_desc';
                displayNotes(currentTag, currentGroup, currentSort);
            } else if (page === 'archive') {
                document.getElementById('archivePage').classList.add('active-page');
                displayArchivedNotes();
            } else if (page === 'tasks') {
                document.getElementById('tasksPage').classList.add('active-page');
                displayTasks();
            }
        });
    });

    // Fix for group navigation clicks
    document.getElementById('notesGroupsSubnav').addEventListener('click', (e) => {
        e.preventDefault();
        const selectedGroup = e.target.dataset.group;
        if (selectedGroup) {
            document.querySelectorAll('#notesGroupsSubnav .nav-sub-item').forEach(item => item.classList.remove('active'));
            e.target.classList.add('active');
            displayNotes('all', selectedGroup, 'created_at_desc'); // Default to newest first
        }
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

    document.getElementById('sortSelect').addEventListener('change', (e) => {
        const selectedSort = e.target.value;
        const currentTag = document.querySelector('.tag-cloud .tag.active')?.dataset.tag || 'all';
        const currentGroup = document.querySelector('#groupFilterCloud .tag.active')?.dataset.groupFilter || 'all';
        displayNotes(currentTag, currentGroup, selectedSort);
    });
    
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
                clearNoteForm();
                displayNotes();
                updateTagCloud();
                renderGroupDatalist();
                updateGroupFilterCloud();
                alert('Note saved successfully!');
            }
        } else {
            alert('Please add a title for your note');
        }
    });

    // Initial load
    const user = await checkAuthState();
    if (user) {
        displayNotes();
        updateTagCloud();
        renderGroupDatalist();
        updateGroupFilterCloud();
    }
});