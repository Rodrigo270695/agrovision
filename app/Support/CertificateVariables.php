<?php

namespace App\Support;

final class CertificateVariables
{
    /**
     * @return array<string, string>
     */
    public static function builtIn(): array
    {
        return [
            'nombre' => 'Nombre del participante',
            'dni' => 'DNI',
            'curso' => 'Curso de la inducción',
            'temario' => 'Temario',
            'fecha' => 'Fecha de la sesión',
            'horas' => 'Horas lectivas',
            'emision' => 'Fecha de emisión',
            'vencimiento' => 'Fecha de expiración',
            'codigo' => 'Código del certificado',
            'firmante' => 'Nombre de quien firma',
            'cargo' => 'Cargo de quien firma',
            'sede' => 'Sede',
            'empresa' => 'Empresa del participante',
        ];
    }

    /**
     * @return list<array{key: string, label: string}>
     */
    public static function forFrontend(): array
    {
        $items = [];

        foreach (self::builtIn() as $key => $label) {
            $items[] = [
                'key' => $key,
                'label' => $label,
            ];
        }

        return $items;
    }

    /**
     * @return list<array{id: string, text: string, x: float, y: float, w: float, size: int, align: string, weight: string, color: string}>
     */
    public static function defaultBlocks(): array
    {
        return [
            self::block('titulo', 'CERTIFICADO', 8, 10, 84, 28, 'center', 'bold'),
            self::block('nombre', '{{nombre}}', 8, 28, 84, 22, 'center', 'bold'),
            self::block('dni', 'DNI {{dni}}', 8, 40, 84, 13, 'center', 'normal'),
            self::block('curso', 'Aprobó satisfactoriamente la capacitación del curso: “{{curso}}”', 8, 50, 84, 13, 'center', 'normal'),
            self::block('cuando', 'Desarrollado el {{fecha}} con una duración de {{horas}} horas lectivas.', 10, 62, 80, 12, 'center', 'normal'),
            self::block('firmante', "{{firmante}}\n{{cargo}}", 34, 86, 32, 11, 'center', 'normal'),
            self::block('meta', "Fecha de Emisión: {{emision}}\nFecha de Expiración: {{vencimiento}}\n{{codigo}}", 4, 78, 28, 9, 'left', 'normal'),
        ];
    }

    /**
     * @return array{blocks: list<array<string, mixed>>, qr: array{x: float, y: float, size: float}, signature: array{x: float, y: float, w: float}}
     */
    public static function defaultLayout(): array
    {
        return [
            'blocks' => self::defaultBlocks(),
            'qr' => ['x' => 84, 'y' => 74, 'size' => 12],
            'signature' => ['x' => 38, 'y' => 72, 'w' => 24],
        ];
    }

    /**
     * @return array{id: string, text: string, x: float, y: float, w: float, size: int, align: string, weight: string, color: string}
     */
    private static function block(
        string $id,
        string $text,
        float $x,
        float $y,
        float $w,
        int $size,
        string $align,
        string $weight,
    ): array {
        return [
            'id' => $id,
            'text' => $text,
            'x' => $x,
            'y' => $y,
            'w' => $w,
            'size' => $size,
            'align' => $align,
            'weight' => $weight,
            'color' => '#1a1a1a',
        ];
    }
}
