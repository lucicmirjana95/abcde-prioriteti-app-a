from pathlib import Path
from PIL import Image
import colorsys


ROOT = Path(__file__).resolve().parents[1]


def replace_warm_horizon_with_moon(source: Path, destination: Path, x_start: float) -> None:
    image = Image.open(source).convert("RGBA")
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(int(width * x_start), width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue

            hue, saturation, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
            is_warm_orange = 0.035 <= hue <= 0.16 and saturation >= 0.10 and red > blue
            if not is_warm_orange:
                continue

            # Preserve the original watercolor luminance and alpha while moving
            # only warm sun/reflection pixels into a quiet silver-lavender range.
            luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
            strength = min(1.0, saturation * 1.6)
            moon_red = min(255, int(luminance * 0.96 + 14))
            moon_green = min(255, int(luminance * 0.97 + 15))
            moon_blue = min(255, int(luminance * 1.08 + 25))
            pixels[x, y] = (
                int(red * (1 - strength) + moon_red * strength),
                int(green * (1 - strength) + moon_green * strength),
                int(blue * (1 - strength) + moon_blue * strength),
                alpha,
            )

    image.save(destination)


def create_growth_path_moon(source: Path, destination: Path) -> None:
    """Cool only the approved horizon sun and its reflection.

    The medallions and the rest of the watercolor path intentionally remain
    byte-for-byte visually unchanged outside this small horizon region.
    """
    image = Image.open(source).convert("RGBA")
    pixels = image.load()

    disk_center = (367.5, 42.0)
    disk_radius = (26.5, 23.5)

    for y in range(18, 98):
        for x in range(334, 397):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue

            ellipse_distance = (
                ((x - disk_center[0]) / disk_radius[0]) ** 2
                + ((y - disk_center[1]) / disk_radius[1]) ** 2
            )
            in_disk = ellipse_distance <= 1.0
            in_reflection = y >= 50 and red > blue * 1.015 and red > green * 0.98
            if not in_disk and not in_reflection:
                continue

            luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
            if in_disk:
                # A restrained pearl-lavender moon, preserving paper texture.
                target = (
                    min(255, int(luminance * 0.94 + 19)),
                    min(255, int(luminance * 0.97 + 22)),
                    min(255, int(luminance * 1.05 + 31)),
                )
                strength = 0.93
            else:
                # Reflection is cooler and quieter than the moon itself.
                target = (
                    min(255, int(luminance * 0.80 + 13)),
                    min(255, int(luminance * 0.91 + 19)),
                    min(255, int(luminance * 1.08 + 30)),
                )
                strength = 0.82

            pixels[x, y] = (
                int(red * (1 - strength) + target[0] * strength),
                int(green * (1 - strength) + target[1] * strength),
                int(blue * (1 - strength) + target[2] * strength),
                alpha,
            )

    image.save(destination)


create_growth_path_moon(
    ROOT / "public/app-a/growth-path-watercolor-evening.png",
    ROOT / "public/app-a/growth-path-watercolor-evening-moon-v4.png",
)

replace_warm_horizon_with_moon(
    ROOT / "public/app-a/illustrations/vision-v2.png",
    ROOT / "public/app-a/illustrations/vision-evening-v3.png",
    0.68,
)
