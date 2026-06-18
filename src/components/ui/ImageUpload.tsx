'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { FiUpload, FiX, FiImage } from 'react-icons/fi';

interface ImageUploadProps {
  bucket?: string;
  folder?: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ bucket = 'Offices', folder = '', value, onChange, label }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const path = folder ? `${folder}/${fileName}` : fileName;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      onChange(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  const remove = () => {
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {label && <label className="block text-sm text-gray-400 mb-1">{label}</label>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-xl border border-dashed border-gray-600 bg-gray-800/50 px-4 py-3 text-sm text-gray-400 hover:border-gray-500 hover:text-white disabled:opacity-50 transition-colors"
        >
          <FiUpload size={16} />
          {uploading ? 'جاري الرفع...' : 'اختر صورة'}
        </button>
        {value && (
          <button type="button" onClick={remove} className="rounded-lg p-2 text-gray-500 hover:text-red-400 transition-colors">
            <FiX size={18} />
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {value && (
        <div className="relative mt-2 inline-block">
          <img src={value} alt="" className="h-24 w-36 rounded-xl object-cover border border-gray-700" />
        </div>
      )}
      {uploading && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-600" />
          جاري الرفع...
        </div>
      )}
    </div>
  );
}
