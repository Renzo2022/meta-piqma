"""
PRISMA 2020 Diagram Generator

Módulo para generar diagramas PRISMA 2020 profesionales en formato SVG.
Proporciona validación de datos y generación de diagramas escalables.

Autor: MetaPiqma Team
Versión: 1.0.0
Uso: python prisma_generator.py
"""

from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple, List
import json
from pathlib import Path


@dataclass
class PRISMAData:
    """
    Clase para validar y gestionar datos PRISMA 2020.
    
    Attributes:
        identified_databases: Registros identificados en bases de datos
        identified_other_methods: Registros identificados por otros métodos
        duplicates_removed: Duplicados eliminados
        other_removed_before_screening: Otros eliminados antes del cribado
        records_screened: Registros cribados
        excluded_screening: Excluidos en cribado
        reports_sought_retrieval: Reportes buscados para recuperación
        reports_not_retrieved: Reportes no recuperados
        reports_assessed_fulltext: Reportes evaluados a texto completo
        exclusion_reasons: Diccionario con razones de exclusión
        total_excluded: Total de estudios excluidos
        studies_qualitative_synthesis: Estudios incluidos en síntesis cualitativa
        studies_meta_analysis: Estudios incluidos en meta-análisis
    """
    
    # Identificación
    identified_databases: int
    identified_other_methods: int
    
    # Cribado
    duplicates_removed: int
    other_removed_before_screening: int
    records_screened: int
    excluded_screening: int
    
    # Elegibilidad
    reports_sought_retrieval: int
    reports_not_retrieved: int
    reports_assessed_fulltext: int
    
    # Exclusiones
    exclusion_reasons: Dict[str, int] = field(default_factory=dict)
    total_excluded: int = 0
    
    # Inclusión
    studies_qualitative_synthesis: int = 0
    studies_meta_analysis: int = 0
    
    def __post_init__(self):
        """Validar datos después de inicialización."""
        is_valid, errors = self.validate()
        if not is_valid:
            raise ValueError(f"Datos PRISMA inválidos:\n" + "\n".join(errors))
    
    def validate(self) -> Tuple[bool, List[str]]:
        """
        Validar coherencia de datos PRISMA.
        
        Returns:
            Tupla (es_válido, lista_de_errores)
        """
        errors = []
        
        # Validar que todos los números sean positivos
        for field_name, value in self.__dict__.items():
            if isinstance(value, int) and value < 0:
                errors.append(f"❌ {field_name} no puede ser negativo: {value}")
        
        # Validar que todos los números sean enteros
        for field_name, value in self.__dict__.items():
            if isinstance(value, int) and not isinstance(value, bool):
                if value != int(value):
                    errors.append(f"❌ {field_name} debe ser un entero: {value}")
        
        # Validar coherencia de identificación
        total_identified = self.identified_databases + self.identified_other_methods
        if total_identified == 0:
            errors.append("❌ El total de registros identificados debe ser mayor a 0")
        
        # Validar coherencia de cribado
        expected_screened = total_identified - self.duplicates_removed - self.other_removed_before_screening
        if self.records_screened != expected_screened:
            errors.append(
                f"❌ Registros cribados inconsistentes. "
                f"Esperado: {expected_screened}, Actual: {self.records_screened}"
            )
        
        # Validar coherencia de elegibilidad
        expected_sought = self.records_screened - self.excluded_screening
        if self.reports_sought_retrieval != expected_sought:
            errors.append(
                f"❌ Reportes buscados inconsistentes. "
                f"Esperado: {expected_sought}, Actual: {self.reports_sought_retrieval}"
            )
        
        # Validar coherencia de recuperación
        expected_assessed = self.reports_sought_retrieval - self.reports_not_retrieved
        if self.reports_assessed_fulltext != expected_assessed:
            errors.append(
                f"❌ Reportes evaluados inconsistentes. "
                f"Esperado: {expected_assessed}, Actual: {self.reports_assessed_fulltext}"
            )
        
        # Validar exclusiones
        if self.exclusion_reasons:
            sum_exclusions = sum(self.exclusion_reasons.values())
            if self.total_excluded != sum_exclusions:
                errors.append(
                    f"❌ Total de exclusiones inconsistente. "
                    f"Suma de razones: {sum_exclusions}, Total: {self.total_excluded}"
                )
        
        # Validar inclusión
        expected_included = self.reports_assessed_fulltext - self.total_excluded
        expected_qualitative = self.studies_qualitative_synthesis
        if expected_qualitative > expected_included:
            errors.append(
                f"❌ Estudios en síntesis cualitativa ({expected_qualitative}) "
                f"no puede ser mayor que estudios incluidos ({expected_included})"
            )
        
        return len(errors) == 0, errors
    
    def to_dict(self) -> Dict:
        """Convertir a diccionario."""
        return {
            "identified_databases": self.identified_databases,
            "identified_other_methods": self.identified_other_methods,
            "duplicates_removed": self.duplicates_removed,
            "other_removed_before_screening": self.other_removed_before_screening,
            "records_screened": self.records_screened,
            "excluded_screening": self.excluded_screening,
            "reports_sought_retrieval": self.reports_sought_retrieval,
            "reports_not_retrieved": self.reports_not_retrieved,
            "reports_assessed_fulltext": self.reports_assessed_fulltext,
            "exclusion_reasons": self.exclusion_reasons,
            "total_excluded": self.total_excluded,
            "studies_qualitative_synthesis": self.studies_qualitative_synthesis,
            "studies_meta_analysis": self.studies_meta_analysis,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "PRISMAData":
        """Crear instancia desde diccionario."""
        return cls(**data)


class PRISMADiagramGenerator:
    """
    Generador de diagramas PRISMA 2020 en SVG.
    
    Genera diagramas profesionales con 4 secciones (Identificación, Cribado,
    Elegibilidad, Inclusión) con cuadros, flechas y etiquetas.
    """
    
    # Configuración visual
    BOX_WIDTH = 650
    BOX_HEIGHT = 110
    SPACING_Y = 160
    MARGIN_X = 50
    MARGIN_Y = 50
    
    # Colores (RGB)
    COLORS = {
        "identification": (76, 175, 80),
        "screening": (255, 193, 7),
        "eligibility": (156, 39, 176),
        "inclusion": (33, 150, 243),
        "text": (0, 0, 0),
        "border": (100, 100, 100),
    }
    
    def __init__(self, prisma_data: PRISMAData):
        """
        Inicializar generador.
        
        Args:
            prisma_data: Instancia de PRISMAData validada
        """
        self.data = prisma_data
    
    def generate_svg(self) -> str:
        """
        Generar diagrama PRISMA en formato SVG.
        
        Returns:
            String con contenido SVG
        """
        # Calcular dimensiones
        total_height = (self.MARGIN_Y * 2) + (self.BOX_HEIGHT * 4) + (self.SPACING_Y * 3)
        total_width = self.BOX_WIDTH + (self.MARGIN_X * 2)
        
        # Iniciar SVG
        svg_parts = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_width}" height="{total_height}" viewBox="0 0 {total_width} {total_height}">',
            '<defs>',
            '<style>',
            'text { font-family: Arial, sans-serif; }',
            '.section-title { font-weight: bold; font-size: 16px; }',
            '.content-text { font-size: 13px; }',
            '</style>',
            '</defs>',
        ]
        
        # Fondo blanco
        svg_parts.append(f'<rect width="{total_width}" height="{total_height}" fill="white"/>')
        
        # Calcular posiciones Y
        y_identification = self.MARGIN_Y
        y_screening = y_identification + self.BOX_HEIGHT + self.SPACING_Y
        y_eligibility = y_screening + self.BOX_HEIGHT + self.SPACING_Y
        y_inclusion = y_eligibility + self.BOX_HEIGHT + self.SPACING_Y
        
        # Sección 1: Identificación
        svg_parts.extend(self._create_identification_box(y_identification))
        svg_parts.extend(self._create_arrow(y_identification + self.BOX_HEIGHT, y_screening))
        
        # Sección 2: Cribado
        svg_parts.extend(self._create_screening_box(y_screening))
        svg_parts.extend(self._create_arrow(y_screening + self.BOX_HEIGHT, y_eligibility))
        
        # Sección 3: Elegibilidad
        svg_parts.extend(self._create_eligibility_box(y_eligibility))
        svg_parts.extend(self._create_arrow(y_eligibility + self.BOX_HEIGHT, y_inclusion))
        
        # Sección 4: Inclusión
        svg_parts.extend(self._create_inclusion_box(y_inclusion))
        
        # Cerrar SVG
        svg_parts.append('</svg>')
        
        return '\n'.join(svg_parts)
    
    def _create_box(self, x: int, y: int, title: str, content: List[str], 
                    color: Tuple[int, int, int]) -> List[str]:
        """
        Crear un cuadro PRISMA.
        
        Args:
            x, y: Posición
            title: Título del cuadro
            content: Lista de líneas de contenido
            color: Color RGB del borde
        
        Returns:
            Lista de elementos SVG
        """
        r, g, b = color
        color_hex = f"rgb({r},{g},{b})"
        
        parts = []
        
        # Borde del cuadro
        parts.append(
            f'<rect x="{x}" y="{y}" width="{self.BOX_WIDTH}" height="{self.BOX_HEIGHT}" '
            f'fill="white" stroke="{color_hex}" stroke-width="2.5" rx="6"/>'
        )
        
        # Título
        parts.append(
            f'<text x="{x + 15}" y="{y + 25}" class="section-title" fill="{color_hex}">'
            f'{title}</text>'
        )
        
        # Contenido
        line_y = y + 48
        for line in content:
            parts.append(
                f'<text x="{x + 15}" y="{line_y}" class="content-text" fill="black">'
                f'{line}</text>'
            )
            line_y += 20
        
        return parts
    
    def _create_arrow(self, y_from: int, y_to: int) -> List[str]:
        """
        Crear flecha vertical entre cuadros.
        
        Args:
            y_from: Posición Y inicial
            y_to: Posición Y final
        
        Returns:
            Lista de elementos SVG
        """
        x_center = self.MARGIN_X + (self.BOX_WIDTH // 2)
        
        parts = []
        
        # Línea vertical
        parts.append(
            f'<line x1="{x_center}" y1="{y_from}" x2="{x_center}" y2="{y_to}" '
            f'stroke="rgb(100,100,100)" stroke-width="2.5"/>'
        )
        
        # Punta de flecha
        arrow_size = 10
        parts.append(
            f'<polygon points="{x_center},{y_to} '
            f'{x_center - arrow_size},{y_to - arrow_size} '
            f'{x_center + arrow_size},{y_to - arrow_size}" '
            f'fill="rgb(100,100,100)"/>'
        )
        
        return parts
    
    def _create_identification_box(self, y: int) -> List[str]:
        """Crear cuadro de Identificación."""
        total = self.data.identified_databases + self.data.identified_other_methods
        content = [
            f"Bases de datos: {self.data.identified_databases}",
            f"Otros métodos: {self.data.identified_other_methods}",
            f"Total identificados: {total}",
        ]
        return self._create_box(
            self.MARGIN_X, y, "IDENTIFICACIÓN",
            content, self.COLORS["identification"]
        )
    
    def _create_screening_box(self, y: int) -> List[str]:
        """Crear cuadro de Cribado."""
        content = [
            f"Duplicados eliminados: {self.data.duplicates_removed}",
            f"Otros eliminados: {self.data.other_removed_before_screening}",
            f"Registros cribados: {self.data.records_screened}",
            f"Excluidos en cribado: {self.data.excluded_screening}",
        ]
        return self._create_box(
            self.MARGIN_X, y, "CRIBADO",
            content, self.COLORS["screening"]
        )
    
    def _create_eligibility_box(self, y: int) -> List[str]:
        """Crear cuadro de Elegibilidad."""
        content = [
            f"Reportes buscados: {self.data.reports_sought_retrieval}",
            f"No recuperados: {self.data.reports_not_retrieved}",
            f"Evaluados a texto completo: {self.data.reports_assessed_fulltext}",
            f"Excluidos: {self.data.total_excluded}",
        ]
        return self._create_box(
            self.MARGIN_X, y, "ELEGIBILIDAD",
            content, self.COLORS["eligibility"]
        )
    
    def _create_inclusion_box(self, y: int) -> List[str]:
        """Crear cuadro de Inclusión."""
        content = [
            f"Síntesis cualitativa: {self.data.studies_qualitative_synthesis}",
            f"Meta-análisis: {self.data.studies_meta_analysis}",
        ]
        return self._create_box(
            self.MARGIN_X, y, "INCLUSIÓN",
            content, self.COLORS["inclusion"]
        )
    
    def save_svg(self, output_path: str) -> bool:
        """
        Guardar diagrama SVG a archivo.
        
        Args:
            output_path: Ruta de salida
        
        Returns:
            True si se guardó exitosamente
        """
        try:
            svg_content = self.generate_svg()
            Path(output_path).write_text(svg_content, encoding='utf-8')
            print(f"✅ Diagrama SVG guardado en: {output_path}")
            return True
        except Exception as e:
            print(f"❌ Error guardando SVG: {e}")
            return False


def generate_prisma_diagram(data: Dict, output_format: str = "svg", 
                           output_path: Optional[str] = None) -> Optional[str]:
    """
    Función principal para generar diagrama PRISMA.
    
    Args:
        data: Diccionario con datos PRISMA
        output_format: Formato de salida ("svg")
        output_path: Ruta de salida (opcional)
    
    Returns:
        String con contenido SVG o None si falla
    
    Ejemplo:
        >>> data = {
        ...     "identified_databases": 1430,
        ...     "identified_other_methods": 45,
        ...     "duplicates_removed": 312,
        ...     "other_removed_before_screening": 25,
        ...     "records_screened": 1138,
        ...     "excluded_screening": 1044,
        ...     "reports_sought_retrieval": 94,
        ...     "reports_not_retrieved": 4,
        ...     "reports_assessed_fulltext": 90,
        ...     "exclusion_reasons": {
        ...         "no_comparative_data": 22,
        ...         "inadequate_design": 15,
        ...         "prevention_not_treatment": 9,
        ...         "poor_methodology": 4,
        ...         "duplicate_data": 3,
        ...     },
        ...     "total_excluded": 53,
        ...     "studies_qualitative_synthesis": 37,
        ...     "studies_meta_analysis": 29,
        ... }
        >>> svg = generate_prisma_diagram(data)
    """
    try:
        # Crear instancia de PRISMAData
        prisma_data = PRISMAData.from_dict(data)
        
        # Crear generador
        generator = PRISMADiagramGenerator(prisma_data)
        
        # Generar SVG
        if output_format.lower() == "svg":
            svg_content = generator.generate_svg()
            
            # Guardar si se especifica ruta
            if output_path:
                generator.save_svg(output_path)
            
            return svg_content
        else:
            print(f"❌ Formato no soportado: {output_format}")
            return None
    
    except ValueError as e:
        print(f"❌ Error de validación: {e}")
        return None
    except Exception as e:
        print(f"❌ Error generando diagrama: {e}")
        return None


# ============================================================================
# EJEMPLO DE USO Y TESTS
# ============================================================================

if __name__ == "__main__":
    # Datos de ejemplo
    example_data = {
        "identified_databases": 1430,
        "identified_other_methods": 45,
        "duplicates_removed": 312,
        "other_removed_before_screening": 25,
        "records_screened": 1138,
        "excluded_screening": 1044,
        "reports_sought_retrieval": 94,
        "reports_not_retrieved": 4,
        "reports_assessed_fulltext": 90,
        "exclusion_reasons": {
            "no_comparative_data": 22,
            "inadequate_design": 15,
            "prevention_not_treatment": 9,
            "poor_methodology": 4,
            "duplicate_data": 3,
        },
        "total_excluded": 53,
        "studies_qualitative_synthesis": 37,
        "studies_meta_analysis": 29,
    }
    
    print("🔍 Generando diagrama PRISMA 2020...")
    print()
    
    # Generar y guardar SVG
    svg_output = generate_prisma_diagram(
        example_data,
        output_format="svg",
        output_path="prisma_diagram.svg"
    )
    
    if svg_output:
        print("✅ Diagrama generado exitosamente")
        print(f"📊 Tamaño del SVG: {len(svg_output)} caracteres")
        print()
        print("📋 Datos validados:")
        prisma = PRISMAData.from_dict(example_data)
        print(f"   - Identificados: {prisma.identified_databases + prisma.identified_other_methods}")
        print(f"   - Cribados: {prisma.records_screened}")
        print(f"   - Evaluados: {prisma.reports_assessed_fulltext}")
        print(f"   - Incluidos: {prisma.studies_qualitative_synthesis + prisma.studies_meta_analysis}")
    else:
        print("❌ Error generando diagrama")
