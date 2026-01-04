// import { supabase } from './supabase'; // Removed

// Supabase storage deprecated. Use Azure Blob Storage in future.
// TODO: Implement Azure Blob Storage integration.

export const uploadFile = async (..._args: any[]) => {
    // console.warn('Supabase storage deprecated. Use Azure Blob Storage.');
    return 'https://placeholder-url.com/file.jpg';
};

export const generateSignedUrl = async (..._args: any[]) => {
    // console.warn('Supabase storage deprecated. Use Azure Blob Storage.');
    return 'https://placeholder-url.com/signed-url';
};

export default {
};
