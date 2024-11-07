const navbar = () => {
  return (
    <div className="bg-white w-full h-16 py-2 border-b border-neutral-200 z-10">
      <div className="w-full h-full mx-auto flex items-center justify-between px-6">
        <div className="flex items-center gap-4 h-10">
          {/* Logo */}
          <img src="/logo.svg" alt="Logo" />
          {/* Demo Badge */}
          <div className="px-3 py-1.5 bg-[#c1eaff] rounded-full flex items-center">
            <div className="text-center text-[#1f1f1f] text-xs font-medium font-poppins leading-[14px]">
              Demo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default navbar;
