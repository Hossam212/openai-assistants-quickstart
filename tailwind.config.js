/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'], 
        inter: ['Inter', 'sans-serif'],  
      },
      keyframes: {
        colorCycle: {
          '0%': {
            backgroundColor: '#00AAFF33', // Light blue color
          },
          '100%': {
            backgroundColor: '#00AAFF', // Dark blue color
          },
        },
      },
      animation: {
        colorCycle: 'colorCycle 1.4s infinite ease-in-out',
      },
    },
  },
  plugins: [],
}