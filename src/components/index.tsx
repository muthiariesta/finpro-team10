// src/app/components/index.tsx
import React from 'react';

// 1. Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger';
  children: React.ReactNode;
}
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-4 py-2 rounded font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer";
  const variants = {
    primary: "bg-[#D91176] text-white hover:bg-[#b00e5f]",
    danger: "bg-[#E53935] text-white hover:bg-red-700 rounded-full px-6",
  };
  return <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

// 2. InputField
interface InputFieldProps {
  label: string;
  type?: string;
  value?: string;
  placeholder?: string;
  readOnly?: boolean;
  icon?: React.ReactNode;
}
export const InputField: React.FC<InputFieldProps> = ({ label, type = 'text', value, placeholder, readOnly, icon }) => {
  return (
    <div className="mb-4">
      <label className="block text-[#D91176] font-semibold mb-1 text-sm">{label}</label>
      <div className="relative">
        <input
          type={type}
          className={`w-full p-2.5 border border-gray-300 rounded-md text-sm text-gray-700 outline-none focus:border-[#D91176] ${readOnly ? 'bg-pink-50/50' : 'bg-white'}`}
          value={value}
          placeholder={placeholder}
          readOnly={readOnly} // <-- PASTIKAN BARIS INI ADA DI KODEMU
        />
        {icon && <span className="absolute right-3 top-3 text-gray-500">{icon}</span>}
      </div>
    </div>
  );
};

// 3. TextAreaField
interface TextAreaFieldProps {
  label: string;
  placeholder?: string;
}
export const TextAreaField: React.FC<TextAreaFieldProps> = ({ label, placeholder }) => {
  return (
    <div className="mb-4">
      <label className="block text-[#D91176] font-semibold mb-1 text-sm">{label}</label>
      <textarea className="w-full p-2.5 border border-gray-300 rounded-md text-sm text-gray-700 outline-none focus:border-[#D91176] min-h-[80px]" placeholder={placeholder}></textarea>
    </div>
  );
};

// 4. FileUpload
export const FileUpload: React.FC = () => {
  return (
    <div className="mb-6">
      <label className="block text-[#D91176] font-semibold mb-1 text-sm">Upload Evidence</label>
      <p className="text-xs text-gray-500 mb-2">Max 5MB.<br />EXIF location/metadata is automatically stripped</p>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors">
        <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
        </svg>
        <span className="text-sm text-gray-600">Upload Photo / Video</span>
        <span className="text-xs text-gray-400">Drag & drop or browse (PNG, JPG, MP4)</span>
      </div>
    </div>
  );
};