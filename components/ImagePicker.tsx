import { useRef, useState } from "react";

interface Props {
  onImage: (file: File, preview: string) => void;
}

export default function ImagePicker({ onImage }: Props) {
  const [preview, setPreview] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      onImage(file, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-lg bg-gray-700 hover:bg-gray-600 text-white py-2"
      >
        Upload Logo
      </button>
      <input
        type="file"
        ref={inputRef}
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      {preview && (
        <img
          src={preview}
          alt="Logo preview"
          className="w-32 h-32 object-cover rounded-lg mx-auto"
        />
      )}
    </div>
  );
}