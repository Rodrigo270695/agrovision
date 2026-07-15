import type { ImgHTMLAttributes } from 'react';

type Props = ImgHTMLAttributes<HTMLImageElement>;

export default function AppLogoIcon({ className, alt = 'Agrovisión', ...props }: Props) {
    return (
        <img
            src="/icon-round.png?v=7"
            alt={alt}
            className={className}
            {...props}
        />
    );
}
