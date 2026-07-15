import type { ImgHTMLAttributes } from 'react';

type Props = ImgHTMLAttributes<HTMLImageElement>;

export default function AppLogoIcon({ className, alt = 'Agrovisión', ...props }: Props) {
    return (
        <img
            src="/icon.png?v=6"
            alt={alt}
            className={className}
            {...props}
        />
    );
}
