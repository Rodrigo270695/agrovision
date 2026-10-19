export const PARETO_PASS_THRESHOLD = 85;

export type InspectionGrade =
    | 'pending'
    | 'rejected'
    | 'approved_notes'
    | 'approved';

export function paretoBand(
    percent: number,
    hasNo?: boolean | null,
): Exclude<InspectionGrade, 'pending'> {
    if (percent < PARETO_PASS_THRESHOLD) {
        return 'rejected';
    }

    if (percent >= 100 && !hasNo) {
        return 'approved';
    }

    return 'approved_notes';
}

export function inspectionGrade(
    result?: string | null,
    percent?: number | null,
    hasNo?: boolean | null,
): InspectionGrade {
    if (result === 'rejected') {
        return 'rejected';
    }

    if (result !== 'approved') {
        return 'pending';
    }

    if (percent == null) {
        return hasNo ? 'approved_notes' : 'approved';
    }

    return paretoBand(percent, hasNo) === 'approved'
        ? 'approved'
        : 'approved_notes';
}

export function inspectionGradeLabel(grade: InspectionGrade): string {
    if (grade === 'rejected') {
        return 'Desaprobado';
    }

    if (grade === 'approved_notes') {
        return 'Aprobado c/ obs.';
    }

    if (grade === 'approved') {
        return 'Aprobado';
    }

    return 'Pendiente';
}
