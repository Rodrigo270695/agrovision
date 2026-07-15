export function getCsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    if (!match) {
        return '';
    }

    return decodeURIComponent(match[1]);
}
