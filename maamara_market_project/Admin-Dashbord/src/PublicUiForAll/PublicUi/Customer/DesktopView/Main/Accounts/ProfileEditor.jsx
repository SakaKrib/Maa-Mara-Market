import React from "react";
import { Input } from "../../../../../../../components/ui/input";
import { Button } from "../../../../../../../components/ui/button";
import { Edit2, ImagePlus, Save } from "lucide-react";

export default function ProfileEditor({ formData, editing, preview, profile, onChange, onImageChange, onToggleEdit }) {
  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Account Settings</h2>
        <Button variant="secondary" onClick={onToggleEdit} className="flex items-center gap-2">
          {editing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          {editing ? "Save" : "Edit"}
        </Button>
      </div>

      <div className="flex items-center gap-4 mt-4">
        <img
          src={preview || profile?.profile_picture || "/default-avatar.png"}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
        />
        {editing && (
          <label className="flex items-center gap-2 text-sm cursor-pointer text-blue-500">
            <ImagePlus className="w-4 h-4" />
            Upload New
            <input type="file" accept="image/*" className="hidden" onChange={onImageChange} />
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          ["first_name", "First Name"],
          ["last_name", "Last Name"],
          ["email", "Email"],
          ["date_of_birth", "Date of Birth"],
          ["phone_number", "Phone Number"],
          ["location", "Location"],
          ["country", "Country"],
          ["city", "City / State"],
          ["address", "Address"],
        ].map(([name, label]) => (
          <div key={name} className={name === "email" || name === "address" ? "md:col-span-2" : ""}>
            <label className="text-sm text-gray-500">{label}</label>
            <Input
              type={name === "date_of_birth" ? "date" : "text"}
              name={name}
              value={formData[name] || ""}
              onChange={onChange}
              disabled={!editing}
            />
          </div>
        ))}
      </div>
    </>
  );
}
