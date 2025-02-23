import os
import requests
from SelfPortraitControlPlatform.app.models import Order

# Trello API credentials
TRELLO_KEY = os.getenv('TRELLO_KEY', '1e2279831dd6b11e82dd7aaa934ee8c0')
TRELLO_TOKEN = os.getenv('TRELLO_TOKEN', 'ATTA45b114110a92d2892d18f6c3da2c2cb5eb19190b483179206702d1a020e380937160F183')
TRELLO_LIST_ID_IN_ARTWORK = os.getenv('TRELLO_LIST_ID_IN_ARTWORK', '677cdb99c93f6f998afd9985')  # List ID for "In Artwork"

def create_trello_card(order: Order):
    """
    Creates a new card on Trello in the 'In Artwork' list whenever an
    order transitions to 'In Artwork'.
    """

    # Safety checks for missing credentials
    if not (TRELLO_KEY and TRELLO_TOKEN and TRELLO_LIST_ID_IN_ARTWORK):
        print("[TRELLO] Missing TRELLO_KEY, TRELLO_TOKEN, or TRELLO_LIST_ID_IN_ARTWORK.")
        return None

    # API endpoint for creating Trello cards
    url = "https://api.trello.com/1/cards"

    # Construct the card's title and description
    card_name = f"Order #{order.id} - {order.school_name or 'Unknown School'}"
    card_desc = (
        f"Order ID: {order.id}\n"
        f"School Name: {order.school_name}\n"
        f"Status: {order.status}\n"
        f"Portal Link: http://localhost:3000/process-slider/{order.id}\n"
        "-------------------------------------------\n"
        "This Trello card was auto-generated from your Flask app."
    )

    # Query parameters for the Trello API
    query_params = {
        'idList': TRELLO_LIST_ID_IN_ARTWORK,
        'key': TRELLO_KEY,
        'token': TRELLO_TOKEN,
        'name': card_name,
        'desc': card_desc,
    }

    # Make the API request
    try:
        response = requests.post(url, params=query_params, timeout=10)
        response.raise_for_status()  # Raise an exception for HTTP errors
    except requests.exceptions.RequestException as e:
        print(f"[TRELLO] Failed to create Trello card for Order #{order.id}: {e}")
        return None

    # Parse and log the response data
    trello_card_data = response.json()
    print(f"[TRELLO] Successfully created Trello card for Order #{order.id} — Card URL: {trello_card_data.get('shortUrl')}")
    return trello_card_data
