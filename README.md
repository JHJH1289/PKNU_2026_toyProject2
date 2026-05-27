# ToyProject2 Travelog

사진 저장소 기능과 여행 피드 기능을 결합한 웹 애플리케이션입니다. 사용자는 사진을 업로드하고 폴더별로 관리할 수 있으며, 여행 게시물에는 여러 장의 이미지, 위치 정보, 경로, 카테고리 태그를 함께 등록할 수 있습니다.

## 기술 스택

### Frontend

- React
- Vite
- JavaScript
- CSS Grid / Flexbox
- Google Maps JavaScript API
- Google Places API
- Google Geocoder API
- FormData 기반 multipart 업로드

### Backend

- Spring Boot
- Spring Security
- JWT 인증
- JPA / Hibernate
- Oracle Database
- MultipartFile 파일 업로드
- Local Storage 기반 파일 저장

## 실행 방법

### Backend

```powershell
cd D:\code\toyProject2\drive
.\gradlew.bat bootRun
```

기본 포트는 `8080`입니다. 이미 서버가 실행 중이면 다음 오류가 발생할 수 있습니다.

```text
Port 8080 was already in use.
```

이 경우 기존 프로세스를 종료하거나 이미 실행 중인 서버를 그대로 사용하면 됩니다.

```powershell
netstat -ano | Select-String ':8080'
Stop-Process -Id <PID> -Force
```

### Frontend

```powershell
cd D:\code\toyProject2\drive-front
npm install
npm run dev
```

기본 개발 서버는 `5173` 포트를 사용합니다.

## 환경 변수

프론트엔드 지도 기능은 Google Maps API 키를 사용합니다.

`drive-front/.env`

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

백엔드 DB, 저장소, JWT 설정은 다음 파일에서 관리합니다.

```text
drive/src/main/resources/application.properties
```

## 프론트엔드 기능

### 1. 화면 구조

핵심 화면은 `drive-front/src/pages/GalleryPage.jsx`에서 구성합니다.

주요 역할:

- 여행 피드 표시
- 내 페이지 표시
- 관리자 모드 표시
- 게시물 작성/수정/삭제
- 좋아요, 댓글, 조회수 표시
- 카테고리 필터링

주요 React Hook:

- `useState`: 탭, 게시물 목록, 프로필, 로딩 상태, 모달 상태 관리
- `useEffect`: 최초 로딩, 사용자 변경 시 데이터 갱신, 모달 뒤로가기 처리
- `useMemo`: 카테고리 목록, 검색 결과, 필터링된 게시물 목록 계산

주요 함수:

- `load()`: 현재 탭에 맞는 게시물 데이터 조회
- `changeTab()`: 피드, 내 페이지, 관리자 탭 전환
- `openUserProfile()`: 특정 사용자 프로필과 게시물 조회
- `handleCreatePost()`: 게시물 작성 API 호출
- `handleUpdatePost()`: 게시물 수정 API 호출
- `handleLike()`: 좋아요 토글
- `handleComment()`: 댓글 작성
- `selectFeedCategory()`: 선택한 태그로 피드 필터링
- `splitTags()`: 태그 문자열을 배열로 변환
- `reorderItems()`: 위치 목록 순서 재배열

### 2. 게시물 작성

게시물 작성은 `PostComposer` 컴포넌트에서 처리합니다.

구현 내용:

- 여러 장 이미지 선택
- 이미지 미리보기
- 설명 입력
- 카테고리 태그 입력
- 지도에서 여러 위치 선택
- 선택한 위치 이름 수정
- 선택한 위치 삭제
- 선택한 위치 드래그 순서 변경

이미지 검증:

- 이미지가 1장도 없으면 작성 버튼 비활성화
- 제출 시에도 `images.length === 0`이면 요청 차단
- `postApi.js`의 `createPost()`에서도 이미지가 없으면 에러 발생

업로드 방식:

- `FormData` 사용
- 이미지 파일은 `images` 필드로 전송
- 위치 목록은 `locations` 값을 JSON 문자열로 직렬화해 전송

### 3. 게시물 카드와 캐러셀

게시물 카드는 `PostCard` 컴포넌트에서 출력합니다.

포함 정보:

- 작성자
- 위치명
- 이미지 캐러셀
- 카테고리 태그
- 본문
- 좋아요
- 댓글
- 조회수

이미지 캐러셀은 `PostImageCarousel`에서 구현합니다.

기능:

- 여러 장 이미지 좌우 이동
- 하단 점 네비게이션
- 현재 슬라이드 번호 표시
- 위치 정보가 있는 게시물은 마지막 슬라이드에 지도 표시
- 지도 슬라이드 제목은 `Marked Map`

### 4. 카테고리/태그 검색

왼쪽 사이드바에는 기본 카테고리 3개를 고정 표시합니다.

기본 카테고리:

- 여행
- 식사
- 카페

그 외 태그는 `More tags` 드롭다운에서 검색해 선택합니다. 추가 태그가 없더라도 `More tags` 버튼은 항상 표시되며, 결과가 없으면 `No tags found.`가 표시됩니다.

관련 상태와 계산:

- `categorySearch`: 검색어
- `categoryDropdownOpen`: 드롭다운 열림 상태
- `categories`: 게시물에서 수집한 전체 태그 목록
- `extraCategories`: 기본 태그를 제외한 추가 태그 목록
- `filteredExtraCategories`: 검색어로 필터링된 추가 태그 목록

### 5. 지도 기능

지도 기능은 `drive-front/src/components/map.jsx`의 `Map` 컴포넌트에서 구현합니다.

주요 기능:

- 게시물 위치 마커 표시
- 여러 위치 경로 라인 표시
- 장소명 검색
- 지도 클릭으로 장소 선택
- 실제 장소명 조회
- 좌표를 주소로 변환
- 선택 장소 이름 수정
- 선택 장소 삭제
- 선택 장소 순서 드래그 변경

주요 함수:

- `loadGoogleMaps()`: Google Maps 스크립트 동적 로드
- `hasCoordinates()`: 위치 좌표 유효성 검사
- `toLatLng()`: Google Maps 좌표 형식으로 변환
- `createRouteMarker()`: 번호 마커 생성
- `createRouteLine()`: 경로 라인 생성
- `searchLocation()`: Places API 기반 장소 검색
- `searchAddress()`: Geocoder API 기반 주소 검색
- `selectClickedLocation()`: 지도 클릭 이벤트 처리
- `reverseGeocodePoint()`: 좌표를 주소로 변환
- `handleLocationDragStart()`: 위치 드래그 시작
- `handleLocationDragOver()`: 드래그 중 드롭 대상 처리
- `handleLocationDrop()`: 위치 순서 변경 완료

장소 클릭 개선:

- `event.placeId`가 있으면 `PlacesService.getDetails()`로 실제 장소명을 조회합니다.
- `placeId`가 없으면 reverse geocode 결과를 사용합니다.
- 이 방식으로 `Pinned place`처럼 임시 이름이 저장되는 문제를 줄였습니다.

### 6. 스타일

주요 스타일은 `drive-front/src/styles/travel.css`에서 관리합니다.

구현 내용:

- 여행 피드 레이아웃
- 왼쪽 사이드바
- 모바일 슬라이드 메뉴
- 게시물 카드
- 이미지 캐러셀 화살표
- 지도 슬라이드
- 태그 검색 드롭다운
- 위치 리스트 드래그 효과
- 이미지 미리보기 그리드

## 백엔드 기능

### 1. 인증

Spring Security와 JWT를 사용합니다.

관련 파일:

- `AuthController.java`
- `AuthService.java`
- `JwtTokenProvider.java`
- `JwtAuthenticationFilter.java`
- `CustomUserDetailsService.java`
- `SecurityConfig.java`

기능:

- 회원가입
- 로그인
- JWT 발급
- JWT 검증
- `USER`, `ADMIN` 역할 구분

### 2. 게시물 API

게시물 기능은 `PostController`와 `PostService`에서 처리합니다.

주요 API:

- `GET /api/posts`: 전체 피드 조회
- `POST /api/posts`: 게시물 작성
- `GET /api/posts/me`: 내 게시물 조회
- `GET /api/posts/users/{username}`: 특정 사용자 게시물 조회
- `PUT /api/posts/{id}`: 게시물 수정
- `DELETE /api/posts/{id}`: 게시물 삭제
- `POST /api/posts/{id}/like`: 좋아요 토글
- `POST /api/posts/{id}/comments`: 댓글 작성
- `GET /api/posts/{id}/image`: 대표 이미지 조회
- `GET /api/posts/{id}/images/{imageIndex}`: 추가 이미지 조회

주요 함수:

- `createPost()`: 게시물 작성
- `getFeed()`: 전체 피드 조회
- `getMyPosts()`: 내 게시물 조회
- `getUserPosts()`: 특정 사용자 게시물 조회
- `updatePost()`: 게시물 수정
- `deletePost()`: 게시물 삭제
- `toggleLike()`: 좋아요 토글
- `getPostImage()`: 게시물 이미지 파일 조회

### 3. 게시물 이미지 처리

게시물은 여러 장의 이미지를 가질 수 있습니다.

관련 구조:

- `POSTS`
- `POST_IMAGES`
- `Post`
- `PostImage`

구현 방식:

- `MultipartFile` 목록으로 이미지 업로드
- `StorageService`로 로컬 저장소에 파일 저장
- DB에는 `storageKey`, `contentType`, `fileSize`, `sortOrder` 저장
- 첫 번째 이미지를 대표 이미지처럼 사용

주요 함수:

- `normalizePostImages()`: 이미지 개수와 유효성 검사
- `toPostImages()`: 저장된 파일 정보를 `PostImage` 엔티티로 변환
- `toPostImageUrls()`: 프론트 응답용 이미지 URL 목록 생성
- `postImageStorageKeys()`: 삭제할 이미지 파일 키 수집

### 4. 게시물 위치 처리

게시물은 여러 위치를 가질 수 있고, 위치 순서는 경로로 사용됩니다.

관련 구조:

- `POST_LOCATIONS`
- `PostLocation`
- `PostLocationRequest`
- `PostLocationResponse`

구현 방식:

- 프론트에서 `locations` 배열을 JSON 문자열로 전송
- `PostController.parseLocations()`에서 DTO 목록으로 변환
- `PostService.normalizeLocations()`에서 값 검증
- `toPostLocations()`로 엔티티 변환
- `sortOrder`로 위치 순서 유지

수정된 사항:

- `PostLocationRequest`에 setter 추가
- `PostUpdateRequest`에 setter 추가
- 위치 포함 게시물 작성 시 JSON 역직렬화 오류 방지

### 5. 댓글

댓글은 `COMMENTS` 테이블로 관리합니다.

주요 API:

- `POST /api/posts/{id}/comments`
- `PUT /api/posts/{postId}/comments/{commentId}`
- `DELETE /api/posts/{postId}/comments/{commentId}`

주요 함수:

- `addComment()`
- `updateComment()`
- `deleteComment()`
- `findComment()`

### 6. 좋아요와 조회수

좋아요는 `POST_LIKES`, 조회 기록은 `POST_VIEWS` 테이블로 관리합니다.

구현 내용:

- 같은 사용자의 좋아요 여부 확인 후 생성/삭제
- 게시물 이미지 조회 시 조회 기록 확인
- 같은 사용자의 중복 조회수 증가 방지

주요 함수:

- `toggleLike()`
- `registerView()`

### 7. 사진 저장소

사진 저장소 기능은 기존 Drive 기능으로 유지됩니다.

관련 테이블:

- `PHOTOS`
- `PHOTO_FOLDERS`
- `FOLDER_SHARE_LINKS`

관련 파일:

- `PhotoController.java`
- `PhotoService.java`
- `PhotoRepository.java`
- `PhotoFolderRepository.java`
- `FolderShareLinkRepository.java`
- `LocalStorageService.java`

주요 기능:

- 사진 업로드
- 썸네일 저장
- 폴더 생성/수정
- 폴더별 사진 조회
- 태그 추가/삭제
- 중복 사진 조회
- 휴지통 처리
- 폴더 공유 링크

## 데이터베이스 구조

### 사용자/권한

- `USERS`
- `ADMINS`

### 게시물

- `POSTS`
- `POST_IMAGES`
- `POST_LOCATIONS`
- `COMMENTS`
- `POST_LIKES`
- `POST_VIEWS`

### 사진 저장소

- `PHOTOS`
- `PHOTO_FOLDERS`
- `FOLDER_SHARE_LINKS`

## 검증

### Frontend

```powershell
cd D:\code\toyProject2\drive-front
npm.cmd run build
```

확인한 내용:

- React/Vite 빌드 통과
- 변경 파일 ESLint 에러 없음
- 이미지 캐러셀 빌드 확인
- 지도 슬라이드 빌드 확인
- 태그 검색 드롭다운 빌드 확인

### Backend

```powershell
cd D:\code\toyProject2\drive
.\gradlew.bat compileJava
```

확인한 내용:

- Java 컴파일 통과
- 위치 포함 multipart POST 요청 성공
- `8080` 서버 실행 상태 확인

## 향후 개선 사항

### Frontend

- `GalleryPage.jsx`의 기존 `useEffect` dependency warning 정리
- 지도 로딩 실패 시 사용자 안내 개선
- 모바일 지도 슬라이드 UI 개선
- 게시물 작성 성공/실패 알림 UX 개선

### Backend / DB

- Hibernate SQL 로그 출력 정리
- `POST_LIKES`, `POST_VIEWS` 중복 방지 unique 제약 추가
- 게시물 태그 정규화 테이블 도입 검토
- `POSTS`의 레거시 이미지/위치 컬럼 정리 검토
- 폴더 경로 문자열 구조를 `FOLDER_ID`, `PARENT_ID` 방식으로 개선 검토
