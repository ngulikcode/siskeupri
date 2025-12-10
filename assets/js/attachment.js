// Attachment Module - Handle file uploads for transactions

// Attachment state
let currentAttachmentFile = null;
let currentAttachmentUrl = null;
let editingAttachmentUrl = null;

// DOM Elements
const attachmentInput = document.getElementById('attachment');
const attachmentPreview = document.getElementById('attachment-preview');
const previewImage = document.getElementById('preview-image');
const removeAttachmentBtn = document.getElementById('remove-attachment-btn');
const attachmentModal = document.getElementById('attachment-modal');
const closeAttachmentModalBtn = document.getElementById('close-attachment-modal-btn');
const attachmentFullImage = document.getElementById('attachment-full-image');
const attachmentTitle = document.getElementById('attachment-title');

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const STORAGE_BUCKET = 'transaction-attachments';

// File Input Change Handler
if (attachmentInput) {
    attachmentInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        if (!validateFile(file)) {
            attachmentInput.value = '';
            return;
        }

        // Store file and show preview
        currentAttachmentFile = file;
        showPreview(file);
    });
}

// Remove Attachment Button
if (removeAttachmentBtn) {
    removeAttachmentBtn.addEventListener('click', () => {
        clearAttachment();
    });
}

// Validate File
function validateFile(file) {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid File Type',
            text: 'Please upload an image file (JPG, PNG, GIF, or WebP)',
        });
        return false;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        Swal.fire({
            icon: 'error',
            title: 'File Too Large',
            text: 'File size must be less than 5MB',
        });
        return false;
    }

    return true;
}

// Show Preview
function showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        attachmentPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// Clear Attachment
function clearAttachment() {
    currentAttachmentFile = null;
    currentAttachmentUrl = null;
    attachmentInput.value = '';
    previewImage.src = '';
    attachmentPreview.classList.add('hidden');
}

// Upload Attachment to Supabase Storage
async function uploadAttachment(file, transactionId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${transactionId}_${Date.now()}.${fileExt}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(fileName);

        return {
            url: urlData.publicUrl,
            name: file.name,
            size: file.size,
            path: fileName
        };
    } catch (error) {
        console.error('Error uploading attachment:', error);
        throw error;
    }
}

// Delete Attachment from Supabase Storage
async function deleteAttachment(url) {
    try {
        if (!url) return;

        // Extract file path from URL
        const urlParts = url.split(`/${STORAGE_BUCKET}/`);
        if (urlParts.length < 2) return;
        
        const filePath = urlParts[1].split('?')[0]; // Remove query params

        const { error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([filePath]);

        if (error) {
            console.error('Error deleting attachment:', error);
        }
    } catch (error) {
        console.error('Error in deleteAttachment:', error);
    }
}

// View Attachment in Modal
function viewAttachment(url, name = 'Attachment') {
    if (!url) return;
    
    attachmentFullImage.src = url;
    attachmentTitle.textContent = name || 'Attachment';
    attachmentModal.classList.remove('hidden');
}

// Close Attachment Modal
if (closeAttachmentModalBtn) {
    closeAttachmentModalBtn.addEventListener('click', () => {
        attachmentModal.classList.add('hidden');
        attachmentFullImage.src = '';
    });
}

// Close modal when clicking outside
if (attachmentModal) {
    attachmentModal.addEventListener('click', (e) => {
        if (e.target === attachmentModal) {
            attachmentModal.classList.add('hidden');
            attachmentFullImage.src = '';
        }
    });
}

// Load Attachment for Editing
function loadAttachmentForEdit(url, name) {
    if (!url) return;
    
    editingAttachmentUrl = url;
    currentAttachmentUrl = url;
    previewImage.src = url;
    attachmentPreview.classList.remove('hidden');
}

// Export functions for use in app.js
window.attachmentModule = {
    uploadAttachment,
    deleteAttachment,
    viewAttachment,
    clearAttachment,
    loadAttachmentForEdit,
    getCurrentFile: () => currentAttachmentFile,
    getCurrentUrl: () => currentAttachmentUrl,
    getEditingUrl: () => editingAttachmentUrl,
    setEditingUrl: (url) => { editingAttachmentUrl = url; },
    hasAttachment: () => currentAttachmentFile !== null || currentAttachmentUrl !== null
};

console.log('Attachment module loaded');
