# Travelog

**Travelog**는 여행 사진 피드와 여행 경로 계획 기능을 제공하는 웹 서비스입니다.
사용자는 여러 장의 사진, 태그, 댓글, 좋아요, 조회수, 지도 위치를 포함한 여행 게시글을 업로드할 수 있습니다. 또한 관광지와 음식점을 선택해 여행 경로를 만들고, 선택한 핀 순서를 저장한 뒤 `My Plan`에서 AI 기반 하루 여행 일정을 생성할 수 있습니다.

## 화면 및 주요 기능

### 여행 피드

![Travel feed carousel](docs/readme-assets/travel-feed-carousel.png)

홈 화면에서는 여행 게시글을 깔끔한 소셜 피드 형태로 확인할 수 있습니다.

* 여러 이미지를 볼 수 있는 캐러셀 기능
* 이미지 개수 표시 및 이전/다음 이동 기능
* 게시글 작성자, 설명, 태그, 좋아요, 댓글, 조회수 표시
* Home, My Page, Travel Planner, 게시글 작성 메뉴를 포함한 사이드바
* 기본 여행 카테고리를 빠르게 선택할 수 있는 필터 기능

### 태그 검색 및 필터링

![Travel feed tag search](docs/readme-assets/travel-feed-tags.png)

사이드바에서는 자주 사용하는 기본 카테고리를 확인하고, 게시글에서 수집된 추가 태그를 검색할 수 있습니다.

* 기본 태그: travel, cafe, food
* 게시글에서 수집된 동적 태그를 확인할 수 있는 더보기 드롭다운
* 태그 이름 검색 기능
* 선택한 카테고리를 강조 표시하여 현재 피드 필터 확인 가능

### 마이페이지

![My page posts](docs/readme-assets/my-page-posts.png)

마이페이지에서는 프로필 정보, 여행 지도, 사용자가 작성한 게시글을 한 번에 확인할 수 있습니다.

* 프로필 이미지, 사용자 이름, 게시글 수, 조회수를 포함한 프로필 카드
* 프로필 정보 수정 기능
* 사용자의 게시글 위치를 기반으로 구성되는 여행 경로 지도
* `My Posts`와 `My Plan`을 분리한 사이드바 하위 메뉴

### My Plan

![Generated travel plan](docs/readme-assets/my-plan-generated.png)

`My Plan`에서는 Travel Planner에서 생성한 여행 경로를 저장하고, 저장된 핀 순서를 기반으로 AI 여행 일정을 생성할 수 있습니다.

* 번호가 표시된 핀과 경로선을 포함한 저장된 여행 지도
* Travel Planner에서 저장한 장소 순서 목록
* AI 여행 일정 생성을 위한 `Create Plan` / `Recreate Plan` 버튼
* 생성 상태, 저장 시간, 생성 시간, 요약, 타임라인 단계 표시
* 저장된 여행 계획 삭제 기능

### Travel Planner 경로 생성

![Travel planner route](docs/readme-assets/travel-planner-route.png)

Travel Planner에서는 여행 경로를 시각적으로 구성한 뒤 `My Plan`에 저장할 수 있습니다.

* 선택한 장소를 기반으로 추천 경로 지도 갱신
* 선택한 장소의 핀 순서 목록 표시
* 드래그 앤 드롭을 통한 경로 순서 변경
* 여러 장소 추가, 접기, 펼치기, 삭제 기능
* 선택한 지도 위치와 경로 순서를 Oracle 데이터베이스에 저장

### 관광지 및 음식점 검색

![Travel planner search](docs/readme-assets/travel-planner-search.png)

각 여행 장소에서는 관광지와 음식점을 검색할 수 있습니다.

* 지역 또는 키워드 기반 관광지 검색
* 여러 관광지를 선택하여 여행 경로에 추가
* 평점, 리뷰 수, 주소, 이미지 정보 표시
* 선택한 관광지 주변 음식점 검색
* 키워드, 가격대, 음식 종류를 활용한 음식점 필터링

## 주요 기능

### 게시글

* 여행 게시글 생성, 수정, 삭제
* 게시글당 여러 이미지 업로드
* 게시글에 여러 지도 위치 추가
* 선택한 위치 순서 변경
* 태그 추가 및 AI 태그 추천 요청
* 좋아요, 댓글, 조회수 기능

### 지도

* Google Maps 연동
* 마커 라벨 및 경로선 표시
* Google Places 기반 장소 검색
* 주소 검색 및 역지오코딩
* 지도 클릭을 통한 위치 선택

### Travel Planner

* 관광지 검색
* 선택한 관광지 주변 음식점 검색
* 여러 장소를 선택해 여행 경로 구성
* 드래그 앤 드롭으로 핀 순서 변경
* 구성한 경로 데이터를 백엔드에 저장
* `My Plan`에서 저장된 경로를 기반으로 AI 여행 일정 생성

### AI

* Ollama 기반 AI 태그 추천
* Ollama 기반 여행 일정 생성
* 현재 사용 중인 모델 설정 위치:

```text
drive/src/main/resources/application.properties
```

```properties
spring.ai.ollama.base-url=http://localhost:11434
spring.ai.ollama.chat.options.model=gemma4:latest
spring.ai.ollama.chat.options.temperature=0.3
```

여행 일정 생성 프롬프트 관리 위치:

```text
drive/src/main/java/com/example/drive/service/TravelRecommendationService.java
```

AI 태그 추천 프롬프트 관리 위치:

```text
drive/src/main/java/com/example/drive/service/AiTagSuggestionService.java
```

## 기술 스택

### Frontend

* React
* Vite
* JavaScript
* Tailwind CSS
* Google Maps JavaScript API
* Google Places API

### Backend

* Spring Boot
* Spring Security
* JWT
* Spring Data JPA / Hibernate
* Oracle Database
* Spring AI with Ollama
* Local file storage

## 데이터베이스

주요 Oracle 스키마는 다음 테이블로 구성됩니다.

* `USERS`
* `POSTS`
* `POST_IMAGES`
* `POST_LOCATIONS`
* `COMMENTS`
* `POST_LIKES`
* `POST_VIEWS`
* `TRAVEL_PLANS`
* `TRAVEL_PLAN_PLACES`
* `TRAVEL_PLAN_STEPS`

Travel Planner의 저장된 여행 계획은 다음 SQL 파일을 사용합니다.

```text
drive/oracle-travel-plan-schema.sql
```

`TRAVEL_PLAN_PLACES` 테이블은 지도 및 경로 데이터를 저장합니다.

* `PLAN_ID`
* `SORT_ORDER`
* `PLACE_NAME`
* `PLACE_KIND`
* `ADDRESS`
* `LATITUDE`
* `LONGITUDE`

## 로컬 실행 방법

### Backend

```powershell
cd D:\code\toyProject2\drive
.\gradlew.bat bootRun
```

백엔드는 기본적으로 `8080` 포트에서 실행됩니다.

### Frontend

```powershell
cd D:\code\toyProject2\drive-front
npm install
npm run dev
```

프론트엔드 개발 서버는 일반적으로 `5173` 포트에서 실행되며, 해당 포트가 사용 중인 경우 다음 사용 가능한 Vite 포트로 실행됩니다.

### Google Maps 설정

`drive-front/.env` 파일을 생성하고 아래 내용을 추가합니다.

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## 검증 방법

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

