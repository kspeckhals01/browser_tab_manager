import { upgradeToPro } from '../../auth/upgradeToPro';

export default function useUpgradeToPro() {
    return async () => {
        try {
            await upgradeToPro();
            // Optionally: toast loading message
        } catch (err) {
            console.error('Upgrade failed', err);
        }
    };
}
