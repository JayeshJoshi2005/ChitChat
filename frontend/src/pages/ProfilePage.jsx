import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User } from "lucide-react";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  return (
    <div className="min-h-screen bg-base-100 pt-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-base-300 rounded-2xl shadow-md p-6 md:p-10 space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Your Profile</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage your personal information</p>
          </div>

          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group hover:scale-105 transition-transform duration-200">
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 md:size-36 rounded-full object-cover border-4 border-base-100 shadow-lg"
              />
              <label
                htmlFor="avatar-upload"
                className={`absolute bottom-0 right-0 bg-base-content p-2 rounded-full cursor-pointer 
                  transition-all duration-200 hover:scale-110 border-2 border-base-100
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-xs text-zinc-400">
              {isUpdatingProfile ? "Uploading..." : "Click the camera to update"}
            </p>
          </div>

          {/* Profile Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <p className="px-4 py-3 bg-base-200 rounded-lg border border-base-content/10">
                {authUser?.fullName}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-3 bg-base-200 rounded-lg border border-base-content/10">
                {authUser?.email}
              </p>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-base-200 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-3">Account Information</h2>
            <div className="space-y-3 text-sm divide-y divide-zinc-700/50">
              <div className="flex items-center justify-between py-2">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
