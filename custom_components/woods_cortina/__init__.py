"""Wood's Cortina IR integration and optional bundled Lovelace resource."""

from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.const import Platform

PLATFORMS = [Platform.CLIMATE]
CARD_PATH = "/woods_cortina/woods-cortina-card.js"


async def async_setup(hass, config):
    """Serve the bundled card exactly once, without modifying dashboard data."""
    path = Path(__file__).parent / "www" / "woods-cortina-card.js"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(CARD_PATH, str(path), False)]
    )
    return True


async def async_setup_entry(hass, entry):
    """Set up the selected BroadLink remote backed climate entity."""
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass, entry):
    """Unload the climate entity; shared JS static path remains until HA restart."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
