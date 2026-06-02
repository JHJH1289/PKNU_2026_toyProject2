# Travelog

Travelog is a travel photo feed and route planner. Users can upload trip posts with multiple photos, tags, comments, likes, views, and map locations. They can also build a travel route from tourist spots and restaurants, save the ordered pins, and generate an AI one-day plan later from My plan.

## Screenshots And Features

### Travel Feed

![Travel feed carousel](docs/readme-assets/travel-feed-carousel.png)

The home feed shows travel posts in a clean social feed layout.

- Multi-image carousel with slide count and navigation.
- Post author, caption, tags, likes, comments, and view count.
- Sidebar navigation for Home, My Page, Travel Planner, and posting.
- Default travel categories are exposed as quick filters.

### Tag Search And Filtering

![Travel feed tag search](docs/readme-assets/travel-feed-tags.png)

The sidebar keeps common categories visible and lets users search additional tags.

- Fixed default tags: travel, cafe, and food.
- More tags dropdown for dynamic tags collected from posts.
- Search box for filtering tag names.
- Selected category highlights the active feed filter.

### My Page

![My page posts](docs/readme-assets/my-page-posts.png)

My Page combines profile information, travel map, and the user's own posts.

- Profile card with avatar, username, post count, and view count.
- Editable profile information.
- Travel route map built from the user's post locations.
- My posts and My plan are separated as sidebar subcategories.

### My Plan

![Generated travel plan](docs/readme-assets/my-plan-generated.png)

My plan stores routes created in Travel Planner and can generate an AI itinerary from the saved pin order.

- Saved route map with numbered pins and route lines.
- Ordered place list saved from the planner.
- Create plan / Recreate plan button for AI itinerary generation.
- Generated plan status, saved time, generated time, summary, and timeline steps.
- Delete button for saved plans.

### Travel Planner Route Builder

![Travel planner route](docs/readme-assets/travel-planner-route.png)

Travel Planner lets users build a route visually before saving it to My plan.

- Recommended route map updates from selected places.
- Pin order list shows the selected route order.
- Route order can be changed by drag and drop.
- Multiple places can be added, folded, opened, and removed.
- Save plan stores the map locations and ordered route in Oracle.

### Tourist Spot And Restaurant Search

![Travel planner search](docs/readme-assets/travel-planner-search.png)

Each planner place can search tourist spots and restaurants.

- Tourist spot search by area or keyword.
- Multiple tourist spots can be selected for the route.
- Results show rating, review count, address, and image when available.
- Restaurant search can run near selected tourist spots.
- Restaurant filters include keyword, price, and cuisine.

## Main Features

### Posts

- Create, update, and delete travel posts.
- Upload multiple images per post.
- Add multiple map locations per post.
- Reorder selected locations.
- Add tags and request AI tag suggestions.
- Like, comment, and track views.

### Maps

- Google Maps integration.
- Marker labels and route lines.
- Place search through Google Places.
- Address lookup and reverse geocoding.
- Location selection from map clicks.

### Travel Planner

- Search tourist spots.
- Search restaurants near selected spots.
- Select multiple route places.
- Drag to reorder pins.
- Save route data to the backend.
- Generate AI plans from saved routes in My plan.

### AI

- Ollama-powered AI tag suggestion.
- Ollama-powered travel itinerary generation.
- Current model is configured in:

```text
drive/src/main/resources/application.properties
```

```properties
spring.ai.ollama.base-url=http://localhost:11434
spring.ai.ollama.chat.options.model=gemma4:latest
spring.ai.ollama.chat.options.temperature=0.3
```

Travel plan prompts are managed in:

```text
drive/src/main/java/com/example/drive/service/TravelRecommendationService.java
```

AI tag prompts are managed in:

```text
drive/src/main/java/com/example/drive/service/AiTagSuggestionService.java
```

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- Tailwind CSS
- Google Maps JavaScript API
- Google Places API

### Backend

- Spring Boot
- Spring Security
- JWT
- Spring Data JPA / Hibernate
- Oracle Database
- Spring AI with Ollama
- Local file storage

## Database

The main Oracle schema includes:

- `USERS`
- `POSTS`
- `POST_IMAGES`
- `POST_LOCATIONS`
- `COMMENTS`
- `POST_LIKES`
- `POST_VIEWS`
- `TRAVEL_PLANS`
- `TRAVEL_PLAN_PLACES`
- `TRAVEL_PLAN_STEPS`

Travel Planner saved plans use:

```text
drive/oracle-travel-plan-schema.sql
```

`TRAVEL_PLAN_PLACES` stores the map and route data:

- `PLAN_ID`
- `SORT_ORDER`
- `PLACE_NAME`
- `PLACE_KIND`
- `ADDRESS`
- `LATITUDE`
- `LONGITUDE`

## Run Locally

### Backend

```powershell
cd D:\code\toyProject2\drive
.\gradlew.bat bootRun
```

The backend runs on port `8080` by default.

### Frontend

```powershell
cd D:\code\toyProject2\drive-front
npm install
npm run dev
```

The frontend dev server usually runs on `5173` or the next available Vite port.

### Google Maps

Create `drive-front/.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Verification

### Backend

```powershell
cd D:\code\toyProject2\drive
.\gradlew.bat test
```

### Frontend

```powershell
cd D:\code\toyProject2\drive-front
npm run lint
npm run build
```
