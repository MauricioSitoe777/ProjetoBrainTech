import os
from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.set_viewport_size({"width": 1280, "height": 1000})

    # Go to landing page where CatalogSection is rendered
    page.goto("http://localhost:5173")
    page.wait_for_timeout(1500)

    # Scroll to catalog section
    print("Scrolling to Catalog section...")
    catalog_header = page.locator("text=Frota Disponível")
    catalog_header.scroll_into_view_if_needed()
    page.wait_for_timeout(1000)

    # 1. Verify that the "Vendidos" filter is visible
    print("Verifying Vendidos filter button is visible...")
    vendidos_btn = page.get_by_role("button", name="Vendidos")
    page.wait_for_timeout(500)

    # 2. Click "Vendidos" filter
    print("Clicking 'Vendidos' filter...")
    vendidos_btn.click()
    page.wait_for_timeout(1000)

    # Take screenshot of the Catalog with "Vendidos" filter active
    page.screenshot(path="/home/jules/verification/screenshots/verification_catalog.png")
    print("Screenshot saved to /home/jules/verification/screenshots/verification_catalog.png")

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
        print("Catalog verification finished successfully!")
