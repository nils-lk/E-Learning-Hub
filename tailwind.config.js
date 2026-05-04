/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // මේකෙන් තමයි dark mode එක ඔන් වෙන්නේ
    theme: {
        extend: {
            colors: {
                nilsBlue: {
                    light: '#3b82f6',
                    DEFAULT: '#1e3a8a', // Professional NILS Blue පාට
                    dark: '#172554',
                }
            }
        },
    },
    plugins: [],
}