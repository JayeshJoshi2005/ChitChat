const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="hidden lg:flex items-center justify-center bg-base-200 p-12 relative overflow-hidden">
      {/* Background animated blobs */}
      <div className="absolute top-10 left-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl animate-float-slow" />
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-secondary/20 rounded-full blur-xl animate-float-fast" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent animate-pulse z-0" />

      <div className="max-w-md text-center relative z-10">
        <div className="mb-8">
          <div className="text-4xl font-extrabold text-primary mb-2 tracking-wide">
            {title}
          </div>
          <p className="text-base-content/60">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default AuthImagePattern;
