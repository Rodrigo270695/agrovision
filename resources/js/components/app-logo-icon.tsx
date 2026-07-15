import type { ImgHTMLAttributes } from 'react';

type Props = ImgHTMLAttributes<HTMLImageElement>;

export default function AppLogoIcon({ className, alt = 'Agrovisión', ...props }: Props) {
    return (
        <img
            src="/icon.png"
            alt={alt}
            className={className}
            {...props}
        />
    );
}
