<?php

namespace App\Support;

final class InductionFormOptions
{
    /**
     * @return array<string, string>
     */
    public static function activities(): array
    {
        return [
            'induccion' => 'Inducción',
            'capacitacion' => 'Capacitación',
            'entrenamiento' => 'Entrenamiento',
            'simulacro' => 'Simulacro',
            'charla' => 'Charla',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function modalities(): array
    {
        return [
            'interna' => 'Interna',
            'inhouse' => 'Inhouse',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function schools(): array
    {
        return [
            'sig' => 'SIG',
            'tecnica' => 'Técnica',
            'gestion_liderazgo' => 'Gestión y Liderazgo',
            'otros' => 'Otros',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function categories(): array
    {
        return [
            'seguridad_salud_trabajo' => 'Seguridad y Salud en el Trabajo',
            'brcgs_ifs' => 'BRCGS/IFS',
            'global_gap' => 'Global GAP',
            'basc' => 'BASC',
            'fsma' => 'FSMA',
            'bpm' => 'BPM',
            'haccp' => 'HACCP',
            'gestion_ambiental' => 'Gestión Ambiental',
            'responsabilidad_social' => 'Responsabilidad Social',
            'proceso_tecnico' => 'Proceso Técnico',
            'otros' => 'Otros',
        ];
    }
}
