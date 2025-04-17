import PopupPage from './presentation/pages/PopupPage';
import { validateUserTier } from './utils/validateUserTier';
import { useEffect } from 'react'




export default function App() {
    useEffect(() => {
    validateUserTier();
}, []);
    return <PopupPage />;
}