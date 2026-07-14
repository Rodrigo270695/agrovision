<?php

namespace App\Support;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class IndexedRedirect
{
    /**
     * Redirige al listado conservando filtros y paginación del referer.
     *
     * @param  array{type: string, message: string}  $toast
     */
    public static function toIndex(
        Request $request,
        string $routeName,
        array $toast,
    ): RedirectResponse {
        $target = route($routeName);
        $referer = $request->headers->get('referer');

        if (is_string($referer) && $referer !== '') {
            $refererPath = parse_url($referer, PHP_URL_PATH);
            $indexPath = parse_url($target, PHP_URL_PATH);

            if (
                is_string($refererPath)
                && is_string($indexPath)
                && rtrim($refererPath, '/') === rtrim($indexPath, '/')
            ) {
                $target = $referer;
            }
        }

        return redirect()->to($target)->with('toast', $toast);
    }
}
