import { clr } from "../lib/colors";

const LoadingDots = () => {
  return (
    <div className="flex items-center h-[48px] pl-[18px] gap-3">
      <div className="flex gap-[7px]">
        <div className="w-[8px] h-[8px] rounded-full bg-[#00AAFF33] animate-colorCycle delay-0"></div>
        <div className="w-[8px] h-[8px] rounded-full bg-[#00AAFF33] animate-colorCycle delay-500"></div>
        <div className="w-[8px] h-[8px] rounded-full bg-[#00AAFF33] animate-colorCycle delay-900"></div>
      </div>
      <p
        className="text-[14px] font-normal leading-[20px] font-poppins"
        style={{ color: clr("gray-600") }}
      >
        Generating...
      </p>
    </div>
  );
};

export default LoadingDots;
