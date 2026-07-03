'use client';

import { useRef, useState } from 'react';
import { FiUpload, FiX } from 'react-icons/fi';
import { supabase } from '@/lib/supabase/client';

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
      {label && <label className="mb-2 block text-sm font-semibold text-gray-400">{label}</label>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex min-h-12 items-center gap-2 rounded-lg border border-dashed border-gray-600 bg-gray-800/50 px-4 py-3 text-sm font-semibold text-gray-400 shadow-sm transition-colors hover:border-blue-600 hover:bg-blue-600/10 hover:text-white disabled:opacity-50"
        >
          <FiUpload size={16} />
          {uploading ? 'جارٍ الرفع...' : 'اختر صورة'}
        </button>
        {value && (
          <button type="button" onClick={remove} className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-500 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400">
            <FiX size={18} />
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {value && (
        <div className="relative mt-3 inline-block overflow-hidden rounded-lg border border-gray-700 bg-gray-900 p-1 shadow-sm">
          <img src={value} alt="" className="h-24 w-36 rounded-lg object-cover" />
        </div>
      )}
      {uploading && (
        <div className="mt-3 flex items-center gap-2 text-sm font-medium text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-600" />
          جارٍ الرفع...
        </div>
      )}
    </div>
  );
}
