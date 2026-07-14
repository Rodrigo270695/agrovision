"""Genera la propuesta MVP profesional Grupo Indelsi → Agrovision S.A.C."""

from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "public" / "logo-indelsi.png"
HEADER = ROOT / "public" / "header-indelsi.png"
OUT = ROOT / "docs" / "Propuesta_MVP_Agrovision_GrupoIndelsi.pdf"

NAVY = HexColor("#1A2B4C")
ROYAL = HexColor("#2E5A9E")
MEDIUM = HexColor("#4A90E2")
ACCENT = HexColor("#6B8EAD")
LIGHT = HexColor("#E8F1FA")
SOFT = HexColor("#F4F7FB")
TEXT = HexColor("#1E293B")
MUTED = HexColor("#64748B")
LINE = HexColor("#CBD5E1")
SUCCESS = HexColor("#0F766E")

W, H = A4
MARGIN = 16 * mm
HEADER_IMG_W = W - 2 * MARGIN
HEADER_IMG_H = HEADER_IMG_W * (162 / 1024)  # proporción banner Indelsi
HEADER_TOP_PAD = 5 * mm
SECTION_BAR_H = 7 * mm
# Espacio generoso entre barra de sección y el primer título de contenido
CONTENT_TOP = H - HEADER_TOP_PAD - HEADER_IMG_H - 3 * mm - SECTION_BAR_H - 10 * mm

pdfmetrics.registerFont(TTFont("Body", r"C:\Windows\Fonts\calibri.ttf"))
pdfmetrics.registerFont(TTFont("BodyBold", r"C:\Windows\Fonts\calibrib.ttf"))
pdfmetrics.registerFont(TTFont("Title", r"C:\Windows\Fonts\seguisb.ttf"))
pdfmetrics.registerFont(TTFont("TitleBold", r"C:\Windows\Fonts\segoeuib.ttf"))


def draw_header_bar(c: canvas.Canvas, title: str | None = None):
    """Cabecera corporativa con logo + datos Indelsi (equivalente visual al footer)."""
    # Fondo superior suave
    c.setFillColor(white)
    c.rect(0, H - HEADER_TOP_PAD - HEADER_IMG_H - 5 * mm, W, HEADER_TOP_PAD + HEADER_IMG_H + 5 * mm, fill=1, stroke=0)

    img_y = H - HEADER_TOP_PAD - HEADER_IMG_H
    if HEADER.exists():
        c.drawImage(
            str(HEADER),
            MARGIN,
            img_y,
            width=HEADER_IMG_W,
            height=HEADER_IMG_H,
            mask="auto",
            preserveAspectRatio=True,
            anchor="c",
        )
    else:
        # Fallback textual si falta el archivo
        c.setFillColor(NAVY)
        c.setFont("TitleBold", 14)
        c.drawString(MARGIN, img_y + HEADER_IMG_H * 0.55, "GRUPO INDELSI S.A.C.")
        c.setFillColor(MUTED)
        c.setFont("Body", 8)
        c.drawString(
            MARGIN,
            img_y + HEADER_IMG_H * 0.25,
            "RUC 20614348471 | Expertos en Gestión de Riesgos y Cumplimiento SST – SSOMA",
        )

    # Línea acento debajo del banner
    line_y = img_y - 2 * mm
    c.setStrokeColor(MEDIUM)
    c.setLineWidth(1.4)
    c.line(MARGIN, line_y, W - MARGIN, line_y)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.line(MARGIN, line_y - 1.2 * mm, W - MARGIN, line_y - 1.2 * mm)

    # Barra de sección (como el footer, pero informativa)
    bar_y = line_y - 2.5 * mm - SECTION_BAR_H
    c.setFillColor(NAVY)
    c.roundRect(MARGIN, bar_y, W - 2 * MARGIN, SECTION_BAR_H, 2.5, fill=1, stroke=0)
    c.setFillColor(MEDIUM)
    c.rect(MARGIN, bar_y, 2.2 * mm, SECTION_BAR_H, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Body", 8)
    c.drawString(MARGIN + 5 * mm, bar_y + 2.3 * mm, "Propuesta técnica MVP  ·  Plataforma SST")
    if title:
        c.setFont("TitleBold", 8)
        c.drawRightString(W - MARGIN - 3 * mm, bar_y + 2.3 * mm, title)


def draw_footer(c: canvas.Canvas, page: int, total: int):
    c.setStrokeColor(MEDIUM)
    c.setLineWidth(1.2)
    c.line(MARGIN, 14 * mm, W - MARGIN, 14 * mm)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.line(MARGIN, 12.8 * mm, W - MARGIN, 12.8 * mm)

    c.setFillColor(NAVY)
    c.setFont("BodyBold", 7.5)
    c.drawString(MARGIN, 8.2 * mm, "GRUPO INDELSI S.A.C.")
    c.setFillColor(MUTED)
    c.setFont("Body", 7.5)
    c.drawString(MARGIN + 32 * mm, 8.2 * mm, "RUC 20614348471  ·  Confidencial")
    c.setFillColor(MUTED)
    c.setFont("Body", 7.5)
    c.drawCentredString(W / 2, 4.5 * mm, "Agrovision S.A.C.  ·  RUC 20554556192")
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 8)
    c.drawRightString(W - MARGIN, 8.2 * mm, f"Página {page} de {total}")


def draw_section_title(c: canvas.Canvas, y: float, number: str, title: str) -> float:
    c.setFillColor(LIGHT)
    c.roundRect(MARGIN, y - 7 * mm, W - 2 * MARGIN, 10 * mm, 3, fill=1, stroke=0)
    c.setFillColor(MEDIUM)
    c.roundRect(MARGIN, y - 7 * mm, 10 * mm, 10 * mm, 3, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("TitleBold", 10)
    c.drawCentredString(MARGIN + 5 * mm, y - 3.8 * mm, number)
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 11)
    c.drawString(MARGIN + 14 * mm, y - 3.8 * mm, title)
    return y - 14 * mm


def draw_bullet(c: canvas.Canvas, x: float, y: float, text: str, max_width: float) -> float:
    c.setFillColor(MEDIUM)
    c.circle(x + 1.5 * mm, y + 1.2 * mm, 1.1 * mm, fill=1, stroke=0)
    c.setFillColor(TEXT)
    c.setFont("Body", 9.5)
    words = text.split()
    lines, current = [], ""
    for w in words:
        trial = (current + " " + w).strip()
        if c.stringWidth(trial, "Body", 9.5) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)
    for i, line in enumerate(lines):
        c.drawString(x + 5 * mm, y - i * 4.2 * mm, line)
    return y - max(1, len(lines)) * 4.2 * mm - 2.2 * mm


def draw_card(c: canvas.Canvas, x, y, w, h, title, lines):
    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.roundRect(x, y - h, w, h, 4, fill=1, stroke=1)
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 9)
    c.drawString(x + 3.5 * mm, y - 6 * mm, title)
    c.setFillColor(MUTED)
    c.setFont("Body", 8)
    ty = y - 11 * mm
    for line in lines:
        c.drawString(x + 3.5 * mm, ty, line)
        ty -= 3.8 * mm


def cover_page(c: canvas.Canvas):
    # Cabecera corporativa
    c.setFillColor(white)
    c.rect(0, H - HEADER_TOP_PAD - HEADER_IMG_H - 6 * mm, W, HEADER_TOP_PAD + HEADER_IMG_H + 6 * mm, fill=1, stroke=0)
    img_y = H - HEADER_TOP_PAD - HEADER_IMG_H
    if HEADER.exists():
        c.drawImage(
            str(HEADER),
            MARGIN,
            img_y,
            width=HEADER_IMG_W,
            height=HEADER_IMG_H,
            mask="auto",
            preserveAspectRatio=True,
            anchor="c",
        )
    c.setStrokeColor(MEDIUM)
    c.setLineWidth(1.6)
    c.line(MARGIN, img_y - 2 * mm, W - MARGIN, img_y - 2 * mm)

    # Bloque hero (navy) con contenido centrado vertical y horizontalmente
    hero_top = img_y - 6 * mm
    hero_bottom = H * 0.40
    c.setFillColor(NAVY)
    c.rect(0, hero_bottom, W, hero_top - hero_bottom, fill=1, stroke=0)
    c.setFillColor(ROYAL)
    path = c.beginPath()
    path.moveTo(0, hero_bottom)
    path.lineTo(W, hero_bottom + (hero_top - hero_bottom) * 0.28)
    path.lineTo(W, hero_bottom)
    path.close()
    c.drawPath(path, fill=1, stroke=0)
    c.setFillColor(MEDIUM)
    c.rect(0, hero_bottom - 2.5 * mm, W, 2.5 * mm, fill=1, stroke=0)

    # Dimensiones del bloque central (logo + títulos con aire)
    logo_w = 30 * mm
    logo_h = logo_w * 0.82
    if LOGO.exists():
        img = PILImage.open(LOGO)
        logo_h = logo_w * (img.height / img.width)

    pad_logo = 5 * mm
    gap_after_logo = 12 * mm
    title_h = 7 * mm
    gap_1 = 10 * mm
    subtitle_h = 5 * mm
    gap_2 = 8 * mm
    tags_h = 4 * mm
    block_h = (logo_h + 2 * pad_logo) + gap_after_logo + title_h + gap_1 + subtitle_h + gap_2 + tags_h

    # Centro vertical del hero
    mid = (hero_top + hero_bottom) / 2
    block_top = mid + block_h / 2

    # Logo centrado
    logo_box_h = logo_h + 2 * pad_logo
    logo_box_w = logo_w + 2 * pad_logo
    logo_box_x = (W - logo_box_w) / 2
    logo_box_y = block_top - logo_box_h
    c.setFillColor(white)
    c.roundRect(logo_box_x, logo_box_y, logo_box_w, logo_box_h, 6, fill=1, stroke=0)
    if LOGO.exists():
        c.drawImage(
            str(LOGO),
            logo_box_x + pad_logo,
            logo_box_y + pad_logo,
            width=logo_w,
            height=logo_h,
            mask="auto",
            preserveAspectRatio=True,
            anchor="c",
        )

    # Títulos con separación clara
    ty = logo_box_y - gap_after_logo
    c.setFillColor(white)
    c.setFont("TitleBold", 20)
    c.drawCentredString(W / 2, ty, "PROPUESTA TÉCNICA — MVP")

    ty -= gap_1 + subtitle_h
    c.setFont("Title", 12)
    c.drawCentredString(W / 2, ty, "Plataforma digital de Seguridad y Salud en el Trabajo")

    ty -= gap_2 + tags_h
    c.setFont("Body", 10)
    c.drawCentredString(
        W / 2,
        ty,
        "Checklists · Cumplimiento · Alertas · Evidencias · KPIs · Comunicación",
    )

    # Cards proveedor / cliente (más aire respecto al hero)
    y = hero_bottom - 14 * mm
    card_h = 38 * mm
    gap = 6 * mm
    card_w = (W - 2 * MARGIN - gap) / 2

    # Proveedor
    c.setFillColor(SOFT)
    c.roundRect(MARGIN, y - card_h, card_w, card_h, 5, fill=1, stroke=0)
    c.setFillColor(MEDIUM)
    c.rect(MARGIN, y - card_h, 2.2 * mm, card_h, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 10)
    c.drawString(MARGIN + 6 * mm, y - 8 * mm, "PROVEEDOR")
    c.setFont("TitleBold", 12)
    c.drawString(MARGIN + 6 * mm, y - 15 * mm, "Grupo Indelsi S.A.C.")
    c.setFillColor(TEXT)
    c.setFont("Body", 9.5)
    c.drawString(MARGIN + 6 * mm, y - 22 * mm, "RUC: 20614348471")
    c.setFillColor(MUTED)
    c.setFont("Body", 8.5)
    c.drawString(MARGIN + 6 * mm, y - 28 * mm, "Gestión de Riesgos y")
    c.drawString(MARGIN + 6 * mm, y - 32.5 * mm, "Cumplimiento SST – SSOMA")

    # Cliente
    c.setFillColor(SOFT)
    c.roundRect(MARGIN + card_w + gap, y - card_h, card_w, card_h, 5, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.rect(MARGIN + card_w + gap, y - card_h, 2.2 * mm, card_h, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 10)
    c.drawString(MARGIN + card_w + gap + 6 * mm, y - 8 * mm, "CLIENTE")
    c.setFont("TitleBold", 12)
    c.drawString(MARGIN + card_w + gap + 6 * mm, y - 15 * mm, "Agrovision S.A.C.")
    c.setFillColor(TEXT)
    c.setFont("Body", 9.5)
    c.drawString(MARGIN + card_w + gap + 6 * mm, y - 22 * mm, "RUC: 20554556192")
    c.setFillColor(MUTED)
    c.setFont("Body", 8.5)
    c.drawString(MARGIN + card_w + gap + 6 * mm, y - 28 * mm, "Solución a medida para")
    c.drawString(MARGIN + card_w + gap + 6 * mm, y - 32.5 * mm, "operaciones y flota")

    # Compromisos
    y2 = y - card_h - 10 * mm
    c.setFillColor(LIGHT)
    c.roundRect(MARGIN, y2 - 24 * mm, W - 2 * MARGIN, 24 * mm, 5, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 9.5)
    c.drawString(MARGIN + 5 * mm, y2 - 7 * mm, "Compromisos clave de esta propuesta")
    c.setFillColor(TEXT)
    c.setFont("Body", 8.5)
    items = [
        "• Aplicación PWA instalable en celular, tablet y escritorio",
        "• Panel de métricas y KPIs + base de datos propiedad del cliente",
        "• MVP: checklist SST (TDP/TDC), evidencias, alertas y comunicación",
    ]
    ty = y2 - 13 * mm
    for it in items:
        c.drawString(MARGIN + 5 * mm, ty, it)
        ty -= 4 * mm

    draw_footer(c, 1, 7)


def page_context(c: canvas.Canvas):
    draw_header_bar(c, "01 · Contexto y alcance")
    y = CONTENT_TOP
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 13)
    c.drawString(MARGIN, y, "Objetivo del MVP")
    y -= 8 * mm
    c.setFillColor(TEXT)
    c.setFont("Body", 9.2)
    text = (
        "Digitalizar y controlar los procesos críticos de Seguridad y Salud en el Trabajo "
        "vinculados a la flota y conductores de Agrovision S.A.C., reemplazando el "
        "uso de papel y hojas sueltas por un flujo móvil, auditable y con evidencias."
    )
    # wrap
    words = text.split()
    line = ""
    max_w = W - 2 * MARGIN
    for w in words:
        trial = (line + " " + w).strip()
        if c.stringWidth(trial, "Body", 9.2) <= max_w:
            line = trial
        else:
            c.drawString(MARGIN, y, line)
            y -= 4.4 * mm
            line = w
    if line:
        c.drawString(MARGIN, y, line)
        y -= 7 * mm

    y = draw_section_title(c, y, "1", "Problemas que resuelve")
    for b in [
        "Checklists TDP y TDC inconsistentes o incompletos en campo.",
        "Dificultad para demostrar evidencias (fotos, firmas, ubicación y hora).",
        "Vencimientos de SOAT, licencias y documentos sin alertas oportunas.",
        "Comunicación lenta con conductores (firmas, inducciones, recordatorios).",
        "Falta de reportes PDF listos para auditoría y supervisión.",
    ]:
        y = draw_bullet(c, MARGIN, y, b, W - 2 * MARGIN - 5 * mm)

    y -= 2 * mm
    y = draw_section_title(c, y, "2", "Resultado esperado del MVP")
    for b in [
        "Operación de inspecciones en campo desde celular (PWA) con o sin fricción mínima.",
        "Trazabilidad completa: quién inspeccionó, qué respondió, cuándo, dónde y con qué evidencia.",
        "Panel de vencimientos y notificaciones (correo / WhatsApp) antes de incumplimientos.",
        "Reportes PDF profesionales de inspecciones y estado documental.",
        "Propiedad y control de los datos por parte de Agrovision S.A.C.",
    ]:
        y = draw_bullet(c, MARGIN, y, b, W - 2 * MARGIN - 5 * mm)

    y -= 3 * mm
    # Caja alcance
    c.setFillColor(SOFT)
    c.roundRect(MARGIN, y - 38 * mm, W - 2 * MARGIN, 38 * mm, 4, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 10)
    c.drawString(MARGIN + 5 * mm, y - 7 * mm, "Alcance del MVP (entregable)")
    c.setFillColor(TEXT)
    c.setFont("Body", 9)
    scope = [
        "Módulo de importación / carga inicial de maestros (empresas, conductores, vehículos).",
        "Checklists digitales TDP (PE-F-SST-057) y TDC (PE-F-SST-058) con reinspaciones.",
        "Firmas virtuales, evidencias fotográficas con GPS/fecha/hora, reportes PDF.",
        "Alertas de vencimientos, carga documental, correos y notificaciones WhatsApp.",
        "Inducción CCT con registro de asistencia y evidencia digital.",
        "Panel de métricas y KPIs operativos para SST y supervisión.",
        "Aplicación PWA + arquitectura moderna; base de datos del cliente.",
    ]
    ty = y - 13 * mm
    for s in scope:
        c.drawString(MARGIN + 5 * mm, ty, "•  " + s)
        ty -= 4.0 * mm

    draw_footer(c, 2, 7)


def page_modules(c: canvas.Canvas):
    draw_header_bar(c, "02 · Módulos funcionales")
    y = CONTENT_TOP
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 12)
    c.drawString(MARGIN, y, "Funcionalidades del MVP — ordenadas")
    y -= 7 * mm

    modules = [
        (
            "01",
            "Importación de datos",
            [
                "Carga inicial y masiva de conductores, vehículos y empresas.",
                "Validación de RUC/DNI, placas y datos obligatorios.",
                "Base limpia para operar desde el día 1.",
            ],
        ),
        (
            "02",
            "Checklists TDP y TDC",
            [
                "Formularios digitales alineados a PE-F-SST-057 / PE-F-SST-058.",
                "1.ª inspección y 2.ª reinspección con estados claros.",
                "Respuestas, observaciones y resultado conforme / no conforme.",
            ],
        ),
        (
            "03",
            "Reportes en PDF",
            [
                "Generación de reportes de inspección listos para archivo.",
                "Encabezado institucional, ítems, firmas y evidencias.",
                "Exportación para supervisión, auditoría y cliente interno.",
            ],
        ),
        (
            "04",
            "Firmas virtuales + correo",
            [
                "Captura de firma digital en pantalla (canvas táctil).",
                "Envío del resultado / constancia al correo del conductor.",
                "Trazabilidad de firma asociada a la inspección.",
            ],
        ),
        (
            "05",
            "Inducción CCT + evidencia",
            [
                "Registro de asistencia a inducciones CCT.",
                "Evidencia digital (asistencia + soporte fotográfico).",
                "Historial consultable por persona / evento.",
            ],
        ),
        (
            "06",
            "Alertas y vencimientos",
            [
                "Monitoreo de SOAT, licencia de conducir y documentos clave.",
                "Alertas preventivas por fechas próximas a vencer.",
                "Visibilidad para SST / operaciones / supervisión.",
            ],
        ),
    ]

    col_w = (W - 2 * MARGIN - 5 * mm) / 2
    row_h = 34 * mm
    for i, (num, title, bullets) in enumerate(modules):
        col = i % 2
        row = i // 2
        x = MARGIN + col * (col_w + 5 * mm)
        top = y - row * (row_h + 5 * mm)
        c.setFillColor(white)
        c.setStrokeColor(LINE)
        c.setLineWidth(0.9)
        c.roundRect(x, top - row_h, col_w, row_h, 4, fill=1, stroke=1)
        c.setFillColor(MEDIUM)
        c.roundRect(x + 3 * mm, top - 9 * mm, 9 * mm, 7 * mm, 2, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("TitleBold", 8)
        c.drawCentredString(x + 7.5 * mm, top - 6.5 * mm, num)
        c.setFillColor(NAVY)
        c.setFont("TitleBold", 10)
        c.drawString(x + 14 * mm, top - 6.5 * mm, title)
        c.setFillColor(TEXT)
        c.setFont("Body", 8.2)
        ty = top - 14 * mm
        maxw = col_w - 10 * mm
        for b in bullets:
            words = b.split()
            lines, cur = [], ""
            for w in words:
                trial = (cur + " " + w).strip()
                if c.stringWidth(trial, "Body", 8.2) <= maxw:
                    cur = trial
                else:
                    if cur:
                        lines.append(cur)
                    cur = w
            if cur:
                lines.append(cur)
            for li, line in enumerate(lines):
                prefix = "• " if li == 0 else "  "
                c.drawString(x + 4 * mm, ty, prefix + line)
                ty -= 3.5 * mm
            ty -= 0.8 * mm

    # Second set below
    y2 = y - 3 * (row_h + 5 * mm) - 2 * mm
    more = [
        ("07", "Documentos de conductores", "Carga, consulta y archivo de expediente digital por conductor."),
        ("08", "Correo electrónico", "Notificaciones transaccionales: firmas, alertas, reportes y constancias."),
        ("09", "WhatsApp", "Recordatorios y alertas operativas vía WhatsApp a conductores / responsables."),
        ("10", "Fotos + GPS", "Evidencias con ubicación en tiempo real, fecha y hora selladas en el registro."),
        ("11", "Métricas y KPIs", "Panel gerencial: cumplimiento, reinspecciones, vencimientos y cobertura de evidencias."),
    ]
    item_h = 13.5 * mm
    for i, (num, title, desc) in enumerate(more):
        top = y2 - i * (item_h + 2.5 * mm)
        c.setFillColor(LIGHT if i % 2 == 0 else SOFT)
        c.roundRect(MARGIN, top - item_h, W - 2 * MARGIN, item_h, 3, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("TitleBold", 9)
        c.drawString(MARGIN + 4 * mm, top - 5 * mm, f"{num}  {title}")
        c.setFillColor(TEXT)
        c.setFont("Body", 8.2)
        c.drawString(MARGIN + 4 * mm, top - 10 * mm, desc)

    draw_footer(c, 3, 7)


def page_pwa_tech(c: canvas.Canvas):
    draw_header_bar(c, "03 · PWA y arquitectura")
    y = CONTENT_TOP
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 12)
    c.drawString(MARGIN, y, "Aplicación PWA e infraestructura")
    y -= 7 * mm

    y = draw_section_title(c, y, "A", "PWA — Progressive Web App")
    for b in [
        "Instalable en celulares Android/iOS, tablets y escritorio (Chrome/Edge).",
        "Acceso rápido desde ícono, sin depender solo de la tienda de aplicaciones.",
        "Diseño mobile-first para inspecciones en campo, patio y ruta.",
        "Experiencia cercana a app nativa: pantalla completa, íconos y carga ágil.",
    ]:
        y = draw_bullet(c, MARGIN, y, b, W - 2 * MARGIN - 5 * mm)

    y -= 2 * mm
    y = draw_section_title(c, y, "B", "Cómo está construida la solución")
    stack = [
        ("Backend", "Laravel (PHP) — API, seguridad, validaciones, PDF, colas y correo."),
        ("Frontend", "React + Inertia — interfaces modernas, rápidas y mantenibles."),
        ("Base de datos", "PostgreSQL — datos estructurados, integridad y respaldos."),
        ("Archivos", "Almacenamiento de evidencias/fotos/firmas con trazabilidad."),
        ("PWA", "Service Worker + manifiesto web para instalación y uso en dispositivos."),
        ("Servidor", "Despliegue en VPS con HTTPS, Nginx y PHP-FPM (ambiente productivo)."),
    ]
    for title, desc in stack:
        c.setFillColor(MEDIUM)
        c.roundRect(MARGIN, y - 1.5 * mm, 28 * mm, 6.5 * mm, 2, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("TitleBold", 8)
        c.drawCentredString(MARGIN + 14 * mm, y, title)
        c.setFillColor(TEXT)
        c.setFont("Body", 9)
        c.drawString(MARGIN + 31 * mm, y, desc)
        y -= 9 * mm

    y -= 3 * mm
    y = draw_section_title(c, y, "C", "Propiedad de la base de datos")
    c.setFillColor(SOFT)
    box_h = 42 * mm
    c.roundRect(MARGIN, y - box_h, W - 2 * MARGIN, box_h, 4, fill=1, stroke=0)
    c.setFillColor(SUCCESS)
    c.setFont("TitleBold", 10)
    c.drawString(MARGIN + 5 * mm, y - 7 * mm, "La información pertenece al cliente")
    c.setFillColor(TEXT)
    c.setFont("Body", 9)
    ownership = [
        "La base de datos operativa de Agrovision S.A.C. es propiedad del cliente.",
        "Grupo Indelsi desarrolla, configura y da soporte técnico; no retiene la titularidad de los datos.",
        "Accesos, respaldos y políticas de seguridad se definen de acuerdo con el cliente.",
        "Al finalizar o migrar el servicio, se facilita la entrega/exportación de la información.",
        "Cumplimiento de confidencialidad respecto a conductores, flota y evidencias SST.",
    ]
    ty = y - 14 * mm
    for o in ownership:
        c.drawString(MARGIN + 5 * mm, ty, "•  " + o)
        ty -= 5 * mm

    y = y - box_h - 10 * mm
    y = draw_section_title(c, y, "D", "Seguridad y buenas prácticas")
    for b in [
        "Acceso autenticado por usuarios autorizados (sin registro público).",
        "Comunicaciones cifradas mediante HTTPS en producción.",
        "Registro de evidencias con metadatos: GPS, fecha, hora y vínculo a la inspección.",
        "Diseño orientado a auditoría y trazabilidad de acciones críticas.",
    ]:
        y = draw_bullet(c, MARGIN, y, b, W - 2 * MARGIN - 5 * mm)

    draw_footer(c, 4, 7)


def page_flow(c: canvas.Canvas):
    draw_header_bar(c, "04 · Flujo operativo")
    y = CONTENT_TOP
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 12)
    c.drawString(MARGIN, y, "Flujo de valor del día a día")
    y -= 8 * mm

    steps = [
        ("1", "Maestros", "Se importan o registran\nconductores y vehículos."),
        ("2", "Inspección", "Inspector completa TDP\no TDC en la PWA."),
        ("3", "Evidencia", "Firma + fotos con GPS,\nfecha y hora."),
        ("4", "Resultado", "Conforme / no conforme;\nreinspección si aplica."),
        ("5", "Comunicación", "Correo / WhatsApp al\nconductor o responsable."),
        ("6", "Control", "Alertas de vencimientos\ny reporte PDF."),
    ]

    box_w = (W - 2 * MARGIN - 5 * 3 * mm) / 3
    box_h = 32 * mm
    for i, (num, title, desc) in enumerate(steps):
        col = i % 3
        row = i // 3
        x = MARGIN + col * (box_w + 3 * mm)
        top = y - row * (box_h + 8 * mm)
        c.setFillColor(NAVY if row == 0 else ROYAL)
        c.roundRect(x, top - box_h, box_w, box_h, 4, fill=1, stroke=0)
        c.setFillColor(MEDIUM)
        c.circle(x + 7 * mm, top - 8 * mm, 4 * mm, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("TitleBold", 10)
        c.drawCentredString(x + 7 * mm, top - 9.2 * mm, num)
        c.setFont("TitleBold", 10)
        c.drawString(x + 13 * mm, top - 9 * mm, title)
        c.setFont("Body", 8)
        dy = top - 16 * mm
        for line in desc.split("\n"):
            c.drawString(x + 4 * mm, dy, line)
            dy -= 4 * mm

    y = y - 2 * (box_h + 8 * mm) - 4 * mm
    y = draw_section_title(c, y, "E", "Checklist TDP / TDC — lógica del MVP")
    for b in [
        "El inspector selecciona tipo de checklist (TDP o TDC) e identifica vehículo/conductor.",
        "Completa los ítems; si es no conforme, queda pendiente de 2.ª inspección.",
        "Se capturan firmas y evidencias fotográficas con coordenadas y sello temporal.",
        "El sistema genera historial consultable y reporte PDF de la inspección.",
    ]:
        y = draw_bullet(c, MARGIN, y, b, W - 2 * MARGIN - 5 * mm)

    y -= 3 * mm
    y = draw_section_title(c, y, "F", "Beneficios para Agrovision")
    benefits = [
        ("Menor riesgo", "Evidencias objetivas ante auditorías y supervisiones."),
        ("Más control", "Vencimientos visibles antes de convertirse en hallazgo."),
        ("Más velocidad", "Operación digital en campo, sin retrabajo en oficina."),
        ("Más orden", "Expediente de conductor, flota e inspecciones en un solo lugar."),
    ]
    bw = (W - 2 * MARGIN - 4 * mm) / 2
    bh = 18 * mm
    for i, (t, d) in enumerate(benefits):
        col = i % 2
        row = i // 2
        x = MARGIN + col * (bw + 4 * mm)
        top = y - row * (bh + 3 * mm)
        c.setFillColor(LIGHT)
        c.roundRect(x, top - bh, bw, bh, 3, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("TitleBold", 9)
        c.drawString(x + 3.5 * mm, top - 6 * mm, t)
        c.setFillColor(TEXT)
        c.setFont("Body", 8.5)
        c.drawString(x + 3.5 * mm, top - 12 * mm, d)

    draw_footer(c, 5, 7)


def page_kpis(c: canvas.Canvas):
    draw_header_bar(c, "05 · Métricas y KPIs")
    y = CONTENT_TOP
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 12)
    c.drawString(MARGIN, y, "Métricas y KPIs del MVP")
    y -= 5 * mm
    c.setFillColor(MUTED)
    c.setFont("Body", 8.5)
    c.drawString(
        MARGIN,
        y,
        "Indicadores para gerencia SST, operaciones y supervisión — medibles desde el primer mes de uso.",
    )
    y -= 7 * mm

    # KPI highlight cards
    highlights = [
        ("% Conf.", "Inspecciones conformes\nsobre el total del período"),
        ("% Docs", "Conductores con documentos\nvigentes (SOAT / licencia)"),
        ("% Evid.", "Inspecciones con foto GPS\ny firma digital completa"),
        ("T. alerta", "Días promedio de\nantecipación a vencimientos"),
    ]
    card_w = (W - 2 * MARGIN - 3 * 3 * mm) / 4
    card_h = 24 * mm
    for i, (metric, label) in enumerate(highlights):
        x = MARGIN + i * (card_w + 3 * mm)
        c.setFillColor(NAVY if i % 2 == 0 else ROYAL)
        c.roundRect(x, y - card_h, card_w, card_h, 4, fill=1, stroke=0)
        c.setFillColor(MEDIUM)
        c.rect(x, y - card_h, card_w, 2 * mm, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("TitleBold", 11)
        c.drawCentredString(x + card_w / 2, y - 8 * mm, metric)
        c.setFont("Body", 6.8)
        ly = y - 13.5 * mm
        for line in label.split("\n"):
            c.drawCentredString(x + card_w / 2, ly, line)
            ly -= 3.2 * mm

    y -= card_h + 7 * mm
    y = draw_section_title(c, y, "1", "KPIs de inspecciones (TDP / TDC)")

    kpis_insp = [
        ("Tasa de conformidad", "% de inspecciones aprobadas (conforme) vs no conformes."),
        ("Tasa de reinspección", "% de unidades que requieren 2.ª inspección en el período."),
        ("Inspecciones / día", "Volumen operativo diario o semanal por inspector o sede."),
        ("Tiempo de cierre", "Horas/días promedio desde 1.ª falla hasta reinspección conforme."),
        ("Cobertura de flota", "% de vehículos inspectados vs flota activa en el mes."),
    ]
    for title, desc in kpis_insp:
        c.setFillColor(MEDIUM)
        c.roundRect(MARGIN, y - 1.2 * mm, 42 * mm, 5.8 * mm, 2, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("TitleBold", 7.5)
        c.drawCentredString(MARGIN + 21 * mm, y, title)
        c.setFillColor(TEXT)
        c.setFont("Body", 8.5)
        c.drawString(MARGIN + 45 * mm, y, desc)
        y -= 6.5 * mm

    y -= 1 * mm
    y = draw_section_title(c, y, "2", "KPIs documentales y de vencimientos")
    kpis_doc = [
        ("Documentos vigentes", "% de conductores/vehículos sin documentos vencidos."),
        ("Alertas abiertas", "Cantidad de vencimientos en 7 / 15 / 30 días."),
        ("Resolución a tiempo", "% de alertas atendidas antes de la fecha de caducidad."),
        ("Expediente completo", "% de conductores con carga documental mínima exigida."),
    ]
    for title, desc in kpis_doc:
        c.setFillColor(NAVY)
        c.roundRect(MARGIN, y - 1.2 * mm, 42 * mm, 5.8 * mm, 2, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("TitleBold", 7.5)
        c.drawCentredString(MARGIN + 21 * mm, y, title)
        c.setFillColor(TEXT)
        c.setFont("Body", 8.5)
        c.drawString(MARGIN + 45 * mm, y, desc)
        y -= 6.5 * mm

    y -= 1 * mm
    y = draw_section_title(c, y, "3", "KPIs de evidencia, comunicación e inducción")

    cols = [
        (
            "Evidencias",
            [
                "% inspecciones con firma digital",
                "% con foto + GPS + fecha/hora",
                "Evidencias rechazadas / incompletas",
            ],
        ),
        (
            "Comunicación",
            [
                "Correos enviados vs entregados",
                "Alertas WhatsApp enviadas",
                "Firmas confirmadas por conductor",
            ],
        ),
        (
            "Inducción CCT",
            [
                "% asistencia vs convocados",
                "Sesiones con evidencia digital",
                "Personas pendientes de inducción",
            ],
        ),
    ]
    col_w = (W - 2 * MARGIN - 2 * 4 * mm) / 3
    col_h = 30 * mm
    for i, (title, items) in enumerate(cols):
        x = MARGIN + i * (col_w + 4 * mm)
        c.setFillColor(SOFT)
        c.roundRect(x, y - col_h, col_w, col_h, 4, fill=1, stroke=0)
        c.setFillColor(MEDIUM)
        c.roundRect(x, y - 8 * mm, col_w, 8 * mm, 4, fill=1, stroke=0)
        # fix bottom corners visual - redraw bottom
        c.rect(x, y - 8 * mm, col_w, 4 * mm, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("TitleBold", 9)
        c.drawCentredString(x + col_w / 2, y - 5.2 * mm, title)
        c.setFillColor(TEXT)
        c.setFont("Body", 8)
        ty = y - 12 * mm
        for item in items:
            c.drawString(x + 3 * mm, ty, "•  " + item)
            ty -= 4.8 * mm

    y -= col_h + 5 * mm
    c.setFillColor(LIGHT)
    c.roundRect(MARGIN, y - 18 * mm, W - 2 * MARGIN, 18 * mm, 4, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 8.5)
    c.drawString(MARGIN + 4 * mm, y - 6 * mm, "Uso del panel de métricas")
    c.setFillColor(TEXT)
    c.setFont("Body", 8)
    c.drawString(
        MARGIN + 4 * mm,
        y - 11 * mm,
        "• Vista por período (día / semana / mes) y filtros por sede, tipo de checklist, inspector o estado.",
    )
    c.drawString(
        MARGIN + 4 * mm,
        y - 15.5 * mm,
        "• Exportable a PDF/Excel para comités SST, auditorías internas y reportes a gerencia.",
    )

    draw_footer(c, 6, 7)


def page_next(c: canvas.Canvas):
    draw_header_bar(c, "06 · Entrega y siguientes pasos")
    y = CONTENT_TOP
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 12)
    c.drawString(MARGIN, y, "Propuesta comercial de avance")
    y -= 7 * mm

    y = draw_section_title(c, y, "1", "Qué incluye este MVP")
    for b in [
        "Plataforma web/PWA con los módulos descritos en este documento.",
        "Configuración de checklists TDP y TDC según formatos SST vigentes.",
        "Panel de métricas y KPIs para SST, operaciones y gerencia.",
        "Capacitación inicial de uso a usuarios clave (SST / operaciones).",
        "Puesta en marcha en entorno productivo con HTTPS.",
        "Acompañamiento de estabilización en la primera etapa de uso.",
    ]:
        y = draw_bullet(c, MARGIN, y, b, W - 2 * MARGIN - 5 * mm)

    y -= 2 * mm
    y = draw_section_title(c, y, "2", "Próximos pasos sugeridos")
    steps = [
        "Validación de alcance y prioridades con Agrovision S.A.C.",
        "Entrega de accesos de demostración y recorrido funcional.",
        "Importación de maestros reales (conductores / vehículos / documentos).",
        "Ajustes de branding, plantillas PDF y textos de notificación.",
        "Go-live operativo con usuarios de campo y supervisión.",
    ]
    for i, s in enumerate(steps, 1):
        c.setFillColor(MEDIUM)
        c.circle(MARGIN + 3 * mm, y + 1.2 * mm, 2.2 * mm, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("TitleBold", 8)
        c.drawCentredString(MARGIN + 3 * mm, y + 0.2 * mm, str(i))
        c.setFillColor(TEXT)
        c.setFont("Body", 9.5)
        c.drawString(MARGIN + 8 * mm, y, s)
        y -= 7 * mm

    y -= 4 * mm
    # Contact / close
    c.setFillColor(NAVY)
    c.roundRect(MARGIN, y - 48 * mm, W - 2 * MARGIN, 48 * mm, 5, fill=1, stroke=0)
    c.setFillColor(MEDIUM)
    c.rect(MARGIN, y - 48 * mm, W - 2 * MARGIN, 2.5 * mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("TitleBold", 12)
    c.drawString(MARGIN + 6 * mm, y - 12 * mm, "Grupo Indelsi S.A.C.")
    c.setFont("Body", 10)
    c.drawString(MARGIN + 6 * mm, y - 19 * mm, "RUC 20614348471  ·  Seguridad en el Trabajo")
    c.drawString(MARGIN + 6 * mm, y - 26 * mm, "Propuesta preparada para: Agrovision S.A.C.  ·  RUC 20554556192")
    c.setFont("Body", 9)
    c.drawString(MARGIN + 6 * mm, y - 35 * mm, "Este documento presenta el alcance funcional del MVP para evaluación comercial.")
    c.drawString(MARGIN + 6 * mm, y - 40 * mm, "Los términos económicos, cronograma y SLAs se detallan en anexo o reunión de cierre.")

    y = y - 58 * mm
    c.setFillColor(SOFT)
    c.roundRect(MARGIN, y - 28 * mm, W - 2 * MARGIN, 28 * mm, 4, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("TitleBold", 10)
    c.drawCentredString(W / 2, y - 9 * mm, "Resumen ejecutivo en una frase")
    c.setFillColor(TEXT)
    c.setFont("Body", 9)
    c.drawCentredString(
        W / 2,
        y - 16 * mm,
        "Una PWA de SST para inspeccionar, evidenciar, alertar y comunicar,",
    )
    c.drawCentredString(
        W / 2,
        y - 21 * mm,
        "con datos propios de Agrovision y tecnología lista para operar en campo.",
    )

    draw_footer(c, 7, 7)


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    candidates = [
        OUT,
        OUT.with_name(OUT.stem + "_ACTUALIZADO.pdf"),
        OUT.with_name(OUT.stem + "_v2.pdf"),
    ]
    out_path = None
    for candidate in candidates:
        try:
            with open(candidate, "wb"):
                pass
            out_path = candidate
            break
        except PermissionError:
            continue
    if out_path is None:
        out_path = OUT.with_name(OUT.stem + "_nuevo.pdf")

    c = canvas.Canvas(str(out_path), pagesize=A4)
    c.setTitle("Propuesta MVP — Grupo Indelsi / Agrovision S.A.C.")
    c.setAuthor("Grupo Indelsi S.A.C.")
    c.setSubject("MVP Plataforma SST PWA")

    cover_page(c)
    c.showPage()
    page_context(c)
    c.showPage()
    page_modules(c)
    c.showPage()
    page_pwa_tech(c)
    c.showPage()
    page_flow(c)
    c.showPage()
    page_kpis(c)
    c.showPage()
    page_next(c)
    c.save()
    print(f"PDF generado: {out_path}")


if __name__ == "__main__":
    main()
