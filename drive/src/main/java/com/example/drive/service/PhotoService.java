package com.example.drive.service;

import com.example.drive.dto.DuplicatePhotoGroupResponse;
import com.example.drive.dto.FolderResponse;
import com.example.drive.dto.FolderShareResponse;
import com.example.drive.dto.PhotoResponse;
import com.example.drive.dto.PhotoUploadBatchResponse;
import com.example.drive.dto.PhotoUploadItemResponse;
import com.example.drive.dto.SharedFolderResponse;
import com.example.drive.dto.StoredFile;
import com.example.drive.entity.FolderShareLink;
import com.example.drive.entity.Photo;
import com.example.drive.entity.PhotoFolder;
import com.example.drive.repository.FolderShareLinkRepository;
import com.example.drive.repository.PhotoFolderRepository;
import com.example.drive.repository.PhotoRepository;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.SecureRandom;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class PhotoService {

    private static final String DEFAULT_FOLDER = "\uAE30\uBCF8";
    private static final long BYTES_PER_GB = 1024L * 1024L * 1024L;
    private static final long MAX_UPLOAD_BATCH_BYTES = 50L * BYTES_PER_GB;
    private static final long ACCOUNT_STORAGE_LIMIT_BYTES = 400L * BYTES_PER_GB;
    private static final SecureRandom SHARE_TOKEN_RANDOM = new SecureRandom();

    private final StorageService storageService;
    private final PhotoRepository photoRepository;
    private final PhotoFolderRepository photoFolderRepository;
    private final FolderShareLinkRepository folderShareLinkRepository;
    private final PhotoThumbnailService photoThumbnailService;

    public PhotoService(
            StorageService storageService,
            PhotoRepository photoRepository,
            PhotoFolderRepository photoFolderRepository,
            FolderShareLinkRepository folderShareLinkRepository,
            PhotoThumbnailService photoThumbnailService
    ) {
        this.storageService = storageService;
        this.photoRepository = photoRepository;
        this.photoFolderRepository = photoFolderRepository;
        this.folderShareLinkRepository = folderShareLinkRepository;
        this.photoThumbnailService = photoThumbnailService;
    }

    @Transactional
    public PhotoUploadBatchResponse upload(String ownerId, String folderPath, String tags, MultipartFile[] files) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        String normalizedTags = String.join(",", normalizeTags(tags));

        if (files == null || files.length == 0) {
            throw new IllegalArgumentException("No files were provided.");
        }

        List<MultipartFile> uploadFiles = Arrays.stream(files)
                .filter(file -> file != null && !file.isEmpty())
                .toList();

        if (uploadFiles.isEmpty()) {
            throw new IllegalArgumentException("No files were provided.");
        }

        validateUploadQuota(normalizedOwnerId, uploadFiles);

        String normalizedFolderPath = normalizeFolderPath(folderPath);
        PhotoFolder folder = ensureFolder(normalizedOwnerId, normalizedFolderPath);
        folder.touch(LocalDateTime.now());

        List<PhotoUploadItemResponse> items = uploadFiles.stream()
                .map(file -> uploadOne(normalizedOwnerId, normalizedFolderPath, normalizedTags, file))
                .toList();

        return new PhotoUploadBatchResponse(items.size(), items);
    }

    public Map<String, Long> getStorageStatus(String ownerId) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        return Map.of(
                "usedBytes", photoRepository.sumFileSizeByOwnerId(normalizedOwnerId),
                "limitBytes", ACCOUNT_STORAGE_LIMIT_BYTES,
                "maxUploadBytes", MAX_UPLOAD_BATCH_BYTES
        );
    }

    public PhotoFile getPhotoFile(String ownerId, Long id, boolean admin) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        Photo photo = findAccessibleStoredPhoto(normalizedOwnerId, id, admin);

        Resource resource = storageService.loadAsResource(photo.getStorageKey());
        String contentType = photo.getContentType() != null
                ? photo.getContentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        return new PhotoFile(resource, contentType);
    }

    public List<PhotoResponse> getPhotos(String ownerId, String folderPath) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        String normalizedFolderPath = normalizeFolderPath(folderPath);

        return photoRepository.findAllByOwnerIdAndFolderPathAndDeletedAtIsNull(normalizedOwnerId, normalizedFolderPath)
                .stream()
                .sorted(photoComparator())
                .map(this::toPhotoResponse)
                .toList();
    }

    @Transactional
    public FolderShareResponse createFolderShareLink(String ownerId, String folderPath) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        String normalizedFolderPath = normalizeFolderPath(folderPath);

        ensureFolderHasPhotos(normalizedOwnerId, normalizedFolderPath);

        FolderShareLink shareLink = folderShareLinkRepository
                .findByOwnerIdAndFolderPath(normalizedOwnerId, normalizedFolderPath)
                .orElseGet(() -> folderShareLinkRepository.save(new FolderShareLink(
                        generateShareToken(),
                        normalizedOwnerId,
                        normalizedFolderPath,
                        LocalDateTime.now()
                )));

        return toFolderShareResponse(shareLink);
    }

    public SharedFolderResponse getSharedFolder(String token) {
        FolderShareLink shareLink = findShareLink(token);
        List<PhotoResponse> photos = getFolderPhotos(shareLink.getOwnerId(), shareLink.getFolderPath())
                .stream()
                .map(photo -> toSharedPhotoResponse(shareLink.getToken(), photo))
                .toList();

        return new SharedFolderResponse(shareLink.getFolderPath(), photos);
    }

    public PhotoFile getSharedPhotoFile(String token, Long id) {
        FolderShareLink shareLink = findShareLink(token);
        Photo photo = findSharedPhoto(shareLink, id);

        Resource resource = storageService.loadAsResource(photo.getStorageKey());
        String contentType = photo.getContentType() != null
                ? photo.getContentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        return new PhotoFile(resource, contentType);
    }

    @Transactional
    public PhotoFile getSharedPhotoThumbnailFile(String token, Long id) {
        FolderShareLink shareLink = findShareLink(token);
        Photo photo = findSharedPhoto(shareLink, id);

        String thumbnailStorageKey = ensureThumbnail(photo);
        if (thumbnailStorageKey == null) {
            return getSharedPhotoFile(token, id);
        }

        Resource resource = storageService.loadAsResource(thumbnailStorageKey);
        return new PhotoFile(resource, MediaType.IMAGE_JPEG_VALUE);
    }

    public String folderZipFilename(String folderPath) {
        return safeDownloadName(normalizeFolderPath(folderPath)) + ".zip";
    }

    public String sharedFolderZipFilename(String token) {
        FolderShareLink shareLink = findShareLink(token);
        return folderZipFilename(shareLink.getFolderPath());
    }

    public void writeFolderZip(String ownerId, String folderPath, OutputStream outputStream) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        String normalizedFolderPath = normalizeFolderPath(folderPath);
        writePhotosZip(getFolderPhotos(normalizedOwnerId, normalizedFolderPath), outputStream);
    }

    public void writeSharedFolderZip(String token, OutputStream outputStream) {
        FolderShareLink shareLink = findShareLink(token);
        writePhotosZip(getFolderPhotos(shareLink.getOwnerId(), shareLink.getFolderPath()), outputStream);
    }

    public List<PhotoResponse> getAllPhotos() {
        return photoRepository.findAll()
                .stream()
                .filter(photo -> !photo.isDeleted())
                .sorted(photoComparator())
                .map(this::toPhotoResponse)
                .toList();
    }

    @Transactional
    public PhotoFile getPhotoThumbnailFile(String ownerId, Long id, boolean admin) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        Photo photo = findAccessibleStoredPhoto(normalizedOwnerId, id, admin);

        String thumbnailStorageKey = ensureThumbnail(photo);
        if (thumbnailStorageKey == null) {
            return getPhotoFile(ownerId, id, admin);
        }

        Resource resource = storageService.loadAsResource(thumbnailStorageKey);
        return new PhotoFile(resource, MediaType.IMAGE_JPEG_VALUE);
    }

    @Transactional
    public List<FolderResponse> getAllFoldersForAdmin() {
        Set<String> ownerIds = new LinkedHashSet<>();
        photoFolderRepository.findAll()
                .stream()
                .map(PhotoFolder::getOwnerId)
                .map(this::normalizeOwnerId)
                .forEach(ownerIds::add);
        photoRepository.findDistinctOwnerId()
                .stream()
                .map(this::normalizeOwnerId)
                .forEach(ownerIds::add);

        for (String ownerId : ownerIds) {
            photoRepository.findDistinctFolderPathByOwnerId(ownerId)
                    .stream()
                    .map(this::normalizeFolderPath)
                    .forEach(folderPath -> ensureFolder(ownerId, folderPath));
        }

        return ownerIds.stream()
                .flatMap(ownerId -> photoFolderRepository.findAllByOwnerId(ownerId)
                        .stream()
                        .sorted(folderComparator())
                        .map(folder -> toFolderResponse(ownerId, folder)))
                .toList();
    }

    @Transactional
    public List<FolderResponse> getFolders(String ownerId) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);

        Set<String> folderPaths = new LinkedHashSet<>();
        photoRepository.findDistinctFolderPathByOwnerId(normalizedOwnerId)
                .stream()
                .map(this::normalizeFolderPath)
                .forEach(folderPaths::add);
        folderPaths.forEach(folderPath -> ensureFolder(normalizedOwnerId, folderPath));

        return photoFolderRepository.findAllByOwnerId(normalizedOwnerId)
                .stream()
                .sorted(folderComparator())
                .map(folder -> toFolderResponse(normalizedOwnerId, folder))
                .toList();
    }

    @Transactional
    public String createFolder(String ownerId, String folderPath) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        String normalizedFolderPath = normalizeFolderPath(folderPath);
        ensureFolder(normalizedOwnerId, normalizedFolderPath);
        return normalizedFolderPath;
    }

    @Transactional
    public void deleteEmptyFolder(String ownerId, String folderPath) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        String normalizedFolderPath = normalizeFolderPath(folderPath);

        long photoCount = photoRepository.countByOwnerIdAndFolderPathAndDeletedAtIsNull(normalizedOwnerId, normalizedFolderPath);
        if (photoCount > 0) {
            throw new IllegalArgumentException("폴더가 비어있지 않습니다.");
        }

        PhotoFolder folder = photoFolderRepository.findByOwnerIdAndFolderPath(normalizedOwnerId, normalizedFolderPath)
                .orElseThrow(() -> new IllegalArgumentException("Folder not found. folderPath=" + normalizedFolderPath));
        photoFolderRepository.delete(folder);
    }

    @Transactional
    public void deleteFolderAsAdmin(String ownerId, String folderPath) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        String normalizedFolderPath = normalizeFolderPath(folderPath);

        List<Photo> photos = photoRepository.findAllByOwnerIdAndFolderPathAndDeletedAtIsNull(normalizedOwnerId, normalizedFolderPath);
        for (Photo photo : photos) {
            deletePhotoFiles(photo);
        }
        photoRepository.deleteAll(photos);

        photoFolderRepository.findByOwnerIdAndFolderPath(normalizedOwnerId, normalizedFolderPath)
                .ifPresent(photoFolderRepository::delete);
    }

    @Transactional
    public String renameFolder(String ownerId, String currentFolderPath, String nextFolderPath) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        String normalizedCurrentFolderPath = normalizeFolderPath(currentFolderPath);

        if (nextFolderPath == null || nextFolderPath.isBlank()) {
            throw new IllegalArgumentException("Folder name is required.");
        }

        String normalizedNextFolderPath = normalizeFolderPath(nextFolderPath);

        if (normalizedCurrentFolderPath.equals(normalizedNextFolderPath)) {
            return normalizedCurrentFolderPath;
        }

        if (photoFolderRepository.findByOwnerIdAndFolderPath(normalizedOwnerId, normalizedNextFolderPath).isPresent()) {
            throw new IllegalArgumentException("Folder already exists. folderPath=" + normalizedNextFolderPath);
        }

        PhotoFolder folder = photoFolderRepository
                .findByOwnerIdAndFolderPath(normalizedOwnerId, normalizedCurrentFolderPath)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Folder not found. folderPath=" + normalizedCurrentFolderPath
                ));
        folder.rename(normalizedNextFolderPath, LocalDateTime.now());
        photoRepository.updateFolderPathByOwnerId(
                normalizedOwnerId,
                normalizedCurrentFolderPath,
                normalizedNextFolderPath
        );

        return normalizedNextFolderPath;
    }

    @Transactional
    public List<FolderResponse> updateFolderOrder(String ownerId, List<String> folderPaths) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);

        if (folderPaths == null || folderPaths.isEmpty()) {
            return getFolders(normalizedOwnerId);
        }

        int order = 0;
        for (String folderPath : folderPaths) {
            String normalizedFolderPath = normalizeFolderPath(folderPath);
            PhotoFolder folder = ensureFolder(normalizedOwnerId, normalizedFolderPath);
            folder.changeSortOrder(order++);
        }

        return getFolders(normalizedOwnerId);
    }

    @Transactional
    public void deletePhoto(String ownerId, Long id, boolean admin) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        Photo photo = findAccessiblePhoto(normalizedOwnerId, id, admin);

        ensureFolder(photo.getOwnerId(), photo.getFolderPath()).touch(LocalDateTime.now());
        photo.moveToTrash(LocalDateTime.now());
    }

    public List<PhotoResponse> getTrashPhotos(String ownerId) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);

        return photoRepository.findAllByOwnerIdAndDeletedAtIsNotNull(normalizedOwnerId)
                .stream()
                .sorted(Comparator
                        .comparing(Photo::getDeletedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Photo::getId, Comparator.reverseOrder()))
                .map(this::toPhotoResponse)
                .toList();
    }

    @Transactional
    public void restorePhoto(String ownerId, Long id) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        Photo photo = findTrashPhoto(normalizedOwnerId, id);
        photo.restoreFromTrash();
        ensureFolder(photo.getOwnerId(), photo.getFolderPath()).touch(LocalDateTime.now());
    }

    @Transactional
    public void deleteTrashPhotoPermanently(String ownerId, Long id) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        Photo photo = findTrashPhoto(normalizedOwnerId, id);
        deletePhotoFiles(photo);
        photoRepository.delete(photo);
    }

    @Transactional
    public int emptyTrash(String ownerId) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        List<Photo> photos = photoRepository.findAllByOwnerIdAndDeletedAtIsNotNull(normalizedOwnerId);
        for (Photo photo : photos) {
            deletePhotoFiles(photo);
        }
        photoRepository.deleteAll(photos);
        return photos.size();
    }

    @Transactional
    public List<PhotoResponse> addTags(String ownerId, List<Long> photoIds, String tags) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        List<String> nextTags = normalizeTags(tags);

        if (photoIds == null || photoIds.isEmpty()) {
            throw new IllegalArgumentException("Photo ids are required.");
        }

        if (nextTags.isEmpty()) {
            throw new IllegalArgumentException("Tags are required.");
        }

        List<Photo> photos = photoRepository.findAllById(photoIds)
                .stream()
                .filter(photo -> normalizedOwnerId.equals(normalizeOwnerId(photo.getOwnerId())))
                .filter(photo -> !photo.isDeleted())
                .toList();

        if (photos.isEmpty()) {
            throw new IllegalArgumentException("No accessible photos were found.");
        }

        Set<String> touchedFolders = new LinkedHashSet<>();
        for (Photo photo : photos) {
            LinkedHashSet<String> mergedTags = new LinkedHashSet<>(splitTags(photo.getTags()));
            mergedTags.addAll(nextTags);
            photo.changeTags(String.join(",", mergedTags));
            touchedFolders.add(photo.getFolderPath());
        }

        LocalDateTime now = LocalDateTime.now();
        for (String folderPath : touchedFolders) {
            ensureFolder(normalizedOwnerId, folderPath).touch(now);
        }

        return photos.stream()
                .sorted(photoComparator())
                .map(this::toPhotoResponse)
                .toList();
    }

    @Transactional
    public List<PhotoResponse> removeTags(String ownerId, List<Long> photoIds, String tags) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        Set<String> tagsToRemove = new LinkedHashSet<>(normalizeTags(tags));

        if (photoIds == null || photoIds.isEmpty()) {
            throw new IllegalArgumentException("Photo ids are required.");
        }

        if (tagsToRemove.isEmpty()) {
            throw new IllegalArgumentException("Tags are required.");
        }

        List<Photo> photos = photoRepository.findAllById(photoIds)
                .stream()
                .filter(photo -> normalizedOwnerId.equals(normalizeOwnerId(photo.getOwnerId())))
                .filter(photo -> !photo.isDeleted())
                .toList();

        if (photos.isEmpty()) {
            throw new IllegalArgumentException("No accessible photos were found.");
        }

        Set<String> touchedFolders = new LinkedHashSet<>();
        for (Photo photo : photos) {
            List<String> remainingTags = splitTags(photo.getTags())
                    .stream()
                    .filter(tag -> !tagsToRemove.contains(tag))
                    .toList();
            photo.changeTags(String.join(",", remainingTags));
            touchedFolders.add(photo.getFolderPath());
        }

        LocalDateTime now = LocalDateTime.now();
        for (String folderPath : touchedFolders) {
            ensureFolder(normalizedOwnerId, folderPath).touch(now);
        }

        return photos.stream()
                .sorted(photoComparator())
                .map(this::toPhotoResponse)
                .toList();
    }

    @Transactional
    public int deleteDuplicatePhotos(String ownerId) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);
        List<DuplicatePhotoGroup> groups = findDuplicatePhotoGroups(normalizedOwnerId);
        List<Photo> duplicates = groups.stream()
                .flatMap(group -> group.duplicatePhotos().stream())
                .toList();

        Set<String> touchedFolders = new LinkedHashSet<>();
        for (Photo duplicate : duplicates) {
            touchedFolders.add(duplicate.getFolderPath());
            duplicate.moveToTrash(LocalDateTime.now());
        }

        LocalDateTime now = LocalDateTime.now();
        for (String folderPath : touchedFolders) {
            ensureFolder(normalizedOwnerId, folderPath).touch(now);
        }

        return duplicates.size();
    }

    public List<DuplicatePhotoGroupResponse> getDuplicatePhotoGroups(String ownerId) {
        String normalizedOwnerId = normalizeOwnerId(ownerId);

        return findDuplicatePhotoGroups(normalizedOwnerId)
                .stream()
                .map(group -> new DuplicatePhotoGroupResponse(
                        toPhotoResponse(group.keepPhoto()),
                        group.duplicatePhotos().stream().map(this::toPhotoResponse).toList()
                ))
                .toList();
    }

    private List<DuplicatePhotoGroup> findDuplicatePhotoGroups(String ownerId) {
        List<Photo> photos = photoRepository.findAllByOwnerIdAndDeletedAtIsNull(ownerId);
        Map<Long, List<Photo>> photosBySize = new HashMap<>();
        for (Photo photo : photos) {
            photosBySize.computeIfAbsent(photo.getFileSize(), ignored -> new ArrayList<>()).add(photo);
        }

        List<DuplicatePhotoGroup> groups = new ArrayList<>();
        for (List<Photo> sameSizePhotos : photosBySize.values()) {
            if (sameSizePhotos.size() < 2) {
                continue;
            }

            Map<String, List<Photo>> photosByHash = new HashMap<>();
            for (Photo photo : sameSizePhotos) {
                photosByHash.computeIfAbsent(fileHash(photo), ignored -> new ArrayList<>()).add(photo);
            }

            for (List<Photo> sameHashPhotos : photosByHash.values()) {
                if (sameHashPhotos.size() < 2) {
                    continue;
                }

                sameHashPhotos.sort(Comparator
                        .comparing(Photo::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Photo::getId));
                groups.add(new DuplicatePhotoGroup(
                        sameHashPhotos.get(0),
                        List.copyOf(sameHashPhotos.subList(1, sameHashPhotos.size()))
                ));
            }
        }

        return groups;
    }

    private PhotoUploadItemResponse uploadOne(String ownerId, String folderPath, String tags, MultipartFile file) {
        StoredFile storedFile = storageService.store(file);

        Photo photo = new Photo(
                ownerId,
                storedFile.getOriginalName(),
                storedFile.getStorageKey(),
                storedFile.getContentType(),
                storedFile.getSize(),
                LocalDateTime.now(),
                folderPath,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
        photo.changeTags(tags);

        String thumbnailStorageKey = photoThumbnailService.createThumbnail(storedFile.getStorageKey());
        photo.changeThumbnailStorageKey(thumbnailStorageKey);

        Photo savedPhoto = photoRepository.save(photo);
        return new PhotoUploadItemResponse(
                savedPhoto.getId(),
                savedPhoto.getOwnerId(),
                savedPhoto.getFolderPath(),
                savedPhoto.getOriginalName(),
                savedPhoto.getStorageKey(),
                savedPhoto.getFileSize(),
                buildImageUrl(savedPhoto.getId()),
                buildThumbnailUrl(savedPhoto.getId()),
                savedPhoto.getWidth(),
                savedPhoto.getHeight(),
                savedPhoto.getTakenAt(),
                savedPhoto.getCameraMake(),
                savedPhoto.getCameraModel(),
                savedPhoto.getFocalLength(),
                savedPhoto.getFNumber(),
                savedPhoto.getExposureTime(),
                savedPhoto.getIso(),
                savedPhoto.getLensModel(),
                savedPhoto.getGpsLatitude(),
                savedPhoto.getGpsLongitude(),
                splitTags(savedPhoto.getTags())
        );
    }

    private void validateUploadQuota(String ownerId, List<MultipartFile> files) {
        long uploadBytes = files.stream()
                .mapToLong(MultipartFile::getSize)
                .sum();

        if (uploadBytes > MAX_UPLOAD_BATCH_BYTES) {
            throw new IllegalArgumentException("한 번에 업로드할 수 있는 용량은 최대 50GB입니다. 선택한 용량: " + formatBytes(uploadBytes));
        }

        long usedBytes = photoRepository.sumFileSizeByOwnerId(ownerId);
        long nextUsedBytes = usedBytes + uploadBytes;

        if (nextUsedBytes > ACCOUNT_STORAGE_LIMIT_BYTES) {
            long remainingBytes = Math.max(0L, ACCOUNT_STORAGE_LIMIT_BYTES - usedBytes);
            throw new IllegalArgumentException(
                    "계정 저장공간 400GB를 초과하여 업로드할 수 없습니다. 현재 사용량: "
                            + formatBytes(usedBytes)
                            + ", 업로드 용량: "
                            + formatBytes(uploadBytes)
                            + ", 남은 용량: "
                            + formatBytes(remainingBytes)
            );
        }
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024L) {
            return bytes + " B";
        }

        String[] units = {"KB", "MB", "GB", "TB"};
        double size = bytes / 1024.0;
        int unitIndex = 0;

        while (size >= 1024.0 && unitIndex < units.length - 1) {
            size /= 1024.0;
            unitIndex += 1;
        }

        return String.format(java.util.Locale.US, size >= 10.0 ? "%.1f %s" : "%.2f %s", size, units[unitIndex]);
    }

    private PhotoResponse toPhotoResponse(Photo photo) {
        return new PhotoResponse(
                photo.getId(),
                photo.getOwnerId(),
                photo.getFolderPath(),
                photo.getOriginalName(),
                photo.getStorageKey(),
                photo.getContentType(),
                photo.getFileSize(),
                buildImageUrl(photo.getId()),
                buildThumbnailUrl(photo.getId()),
                photo.getCreatedAt(),
                photo.getDeletedAt(),
                photo.getWidth(),
                photo.getHeight(),
                photo.getTakenAt(),
                photo.getCameraMake(),
                photo.getCameraModel(),
                photo.getFocalLength(),
                photo.getFNumber(),
                photo.getExposureTime(),
                photo.getIso(),
                photo.getLensModel(),
                photo.getGpsLatitude(),
                photo.getGpsLongitude(),
                splitTags(photo.getTags())
        );
    }

    private PhotoResponse toSharedPhotoResponse(String token, Photo photo) {
        return new PhotoResponse(
                photo.getId(),
                photo.getOwnerId(),
                photo.getFolderPath(),
                photo.getOriginalName(),
                photo.getStorageKey(),
                photo.getContentType(),
                photo.getFileSize(),
                "/api/share/" + token + "/view/" + photo.getId(),
                "/api/share/" + token + "/thumbnail/" + photo.getId(),
                photo.getCreatedAt(),
                photo.getDeletedAt(),
                photo.getWidth(),
                photo.getHeight(),
                photo.getTakenAt(),
                photo.getCameraMake(),
                photo.getCameraModel(),
                photo.getFocalLength(),
                photo.getFNumber(),
                photo.getExposureTime(),
                photo.getIso(),
                photo.getLensModel(),
                photo.getGpsLatitude(),
                photo.getGpsLongitude(),
                splitTags(photo.getTags())
        );
    }

    private FolderShareResponse toFolderShareResponse(FolderShareLink shareLink) {
        return new FolderShareResponse(
                shareLink.getToken(),
                shareLink.getFolderPath(),
                "/share/" + shareLink.getToken(),
                shareLink.getCreatedAt()
        );
    }

    private List<Photo> getFolderPhotos(String ownerId, String folderPath) {
        return photoRepository.findAllByOwnerIdAndFolderPathAndDeletedAtIsNull(ownerId, folderPath)
                .stream()
                .sorted(photoComparator())
                .toList();
    }

    private void ensureFolderHasPhotos(String ownerId, String folderPath) {
        if (photoRepository.countByOwnerIdAndFolderPathAndDeletedAtIsNull(ownerId, folderPath) == 0) {
            throw new IllegalArgumentException("Folder has no photos. folderPath=" + folderPath);
        }
    }

    private FolderShareLink findShareLink(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Share token is required.");
        }

        return folderShareLinkRepository.findByToken(token.trim())
                .orElseThrow(() -> new IllegalArgumentException("Share link not found."));
    }

    private Photo findSharedPhoto(FolderShareLink shareLink, Long id) {
        Photo photo = findOwnedPhoto(shareLink.getOwnerId(), id);
        if (!shareLink.getFolderPath().equals(normalizeFolderPath(photo.getFolderPath()))) {
            throw new IllegalArgumentException("Photo not found. id=" + id);
        }
        return photo;
    }

    private String generateShareToken() {
        byte[] bytes = new byte[24];
        String token;
        do {
            SHARE_TOKEN_RANDOM.nextBytes(bytes);
            token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        } while (folderShareLinkRepository.findByToken(token).isPresent());
        return token;
    }

    private void writePhotosZip(List<Photo> photos, OutputStream outputStream) {
        if (photos.isEmpty()) {
            throw new IllegalArgumentException("Folder has no photos.");
        }

        Map<String, Integer> usedNames = new HashMap<>();
        try (ZipOutputStream zipOutputStream = new ZipOutputStream(outputStream)) {
            for (Photo photo : photos) {
                String entryName = uniqueZipEntryName(photo.getOriginalName(), usedNames);
                zipOutputStream.putNextEntry(new ZipEntry(entryName));
                Resource resource = storageService.loadAsResource(photo.getStorageKey());
                try (InputStream inputStream = resource.getInputStream()) {
                    inputStream.transferTo(zipOutputStream);
                }
                zipOutputStream.closeEntry();
            }
            zipOutputStream.finish();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to write folder ZIP.", e);
        }
    }

    private String uniqueZipEntryName(String originalName, Map<String, Integer> usedNames) {
        String safeName = safeDownloadName(originalName);
        int count = usedNames.getOrDefault(safeName, 0);
        usedNames.put(safeName, count + 1);
        if (count == 0) {
            return safeName;
        }

        int dotIndex = safeName.lastIndexOf('.');
        if (dotIndex > 0) {
            return safeName.substring(0, dotIndex) + " (" + count + ")" + safeName.substring(dotIndex);
        }
        return safeName + " (" + count + ")";
    }

    private String safeDownloadName(String name) {
        if (name == null || name.isBlank()) {
            return "download";
        }

        String safeName = name.trim()
                .replace('\\', '_')
                .replace('/', '_')
                .replaceAll("[\\p{Cntrl}:*?\"<>|]+", "_")
                .replaceAll("\\s+", " ");

        safeName = safeName.replaceAll("^\\.+", "").trim();
        return safeName.isBlank() ? "download" : safeName;
    }

    private Photo findOwnedPhoto(String ownerId, Long id) {
        return photoRepository.findByIdAndOwnerIdAndDeletedAtIsNull(id, ownerId)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found. id=" + id));
    }

    private Photo findTrashPhoto(String ownerId, Long id) {
        return photoRepository.findByIdAndOwnerIdAndDeletedAtIsNotNull(id, ownerId)
                .orElseThrow(() -> new IllegalArgumentException("Trash photo not found. id=" + id));
    }

    private Photo findAccessiblePhoto(String ownerId, Long id, boolean admin) {
        if (admin) {
            return photoRepository.findById(id)
                    .filter(photo -> !photo.isDeleted())
                    .orElseThrow(() -> new IllegalArgumentException("Photo not found. id=" + id));
        }

        return findOwnedPhoto(ownerId, id);
    }

    private Photo findAccessibleStoredPhoto(String ownerId, Long id, boolean admin) {
        Photo photo = photoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found. id=" + id));

        if (!admin && !ownerId.equals(normalizeOwnerId(photo.getOwnerId()))) {
            throw new IllegalArgumentException("Photo not found. id=" + id);
        }

        return photo;
    }

    private Comparator<Photo> photoComparator() {
        return Comparator
                .comparing(Photo::getTakenAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Photo::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Photo::getId, Comparator.reverseOrder());
    }

    private String buildImageUrl(Long photoId) {
        return "/api/photos/view/" + photoId;
    }

    private String buildThumbnailUrl(Long photoId) {
        return "/api/photos/thumbnail/" + photoId;
    }

    private String ensureThumbnail(Photo photo) {
        if (photo.getThumbnailStorageKey() != null && !photo.getThumbnailStorageKey().isBlank()) {
            try {
                storageService.loadAsResource(photo.getThumbnailStorageKey());
                return photo.getThumbnailStorageKey();
            } catch (RuntimeException ignored) {
                photo.changeThumbnailStorageKey(null);
            }
        }

        String thumbnailStorageKey = photoThumbnailService.createThumbnail(photo.getStorageKey());
        photo.changeThumbnailStorageKey(thumbnailStorageKey);
        return thumbnailStorageKey;
    }

    private void deletePhotoFiles(Photo photo) {
        if (photo.getThumbnailStorageKey() != null && !photo.getThumbnailStorageKey().isBlank()) {
            storageService.delete(photo.getThumbnailStorageKey());
        }
        storageService.delete(photo.getStorageKey());
    }

    private String fileHash(Photo photo) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            Resource resource = storageService.loadAsResource(photo.getStorageKey());
            try (InputStream inputStream = new DigestInputStream(resource.getInputStream(), digest)) {
                inputStream.transferTo(OutputStream.nullOutputStream());
            }
            return Base64.getEncoder().encodeToString(digest.digest());
        } catch (NoSuchAlgorithmException | IOException e) {
            throw new IllegalStateException("Failed to inspect duplicate photo.", e);
        }
    }

    private PhotoFolder ensureFolder(String ownerId, String folderPath) {
        return photoFolderRepository.findByOwnerIdAndFolderPath(ownerId, folderPath)
                .orElseGet(() -> {
                    PhotoFolder folder = new PhotoFolder(ownerId, folderPath, LocalDateTime.now());
                    folder.changeSortOrder(nextFolderSortOrder(ownerId));
                    return photoFolderRepository.saveAndFlush(folder);
                });
    }

    private FolderResponse toFolderResponse(String ownerId, PhotoFolder folder) {
        LocalDateTime latestPhotoAt = photoRepository
                .findLatestPhotoAtByOwnerIdAndFolderPath(ownerId, folder.getFolderPath())
                .orElse(null);
        LocalDateTime updatedAt = latestDate(folder.getUpdatedAt(), latestPhotoAt);

        List<Photo> folderPhotos = photoRepository.findAllByOwnerIdAndFolderPathAndDeletedAtIsNull(ownerId, folder.getFolderPath());

        return new FolderResponse(
                ownerId,
                folder.getFolderPath(),
                updatedAt,
                folder.getSortOrder(),
                folderPhotos.size(),
                photoRepository.sumFileSizeByOwnerIdAndFolderPath(ownerId, folder.getFolderPath()),
                latestPhotoAt,
                folderPhotos.stream()
                        .flatMap(photo -> splitTags(photo.getTags()).stream())
                        .distinct()
                        .sorted()
                        .toList(),
                folderPhotos
                        .stream()
                        .sorted(photoComparator())
                        .limit(3)
                        .map(photo -> buildThumbnailUrl(photo.getId()))
                        .toList()
        );
    }

    private List<String> normalizeTags(String tags) {
        if (tags == null || tags.isBlank()) {
            return List.of();
        }

        return Stream.of(tags.split("[,#\\s]+"))
                .map(String::trim)
                .filter(tag -> !tag.isBlank())
                .distinct()
                .limit(20)
                .toList();
    }

    private List<String> splitTags(String tags) {
        if (tags == null || tags.isBlank()) {
            return List.of();
        }

        return Stream.of(tags.split(","))
                .map(String::trim)
                .filter(tag -> !tag.isBlank())
                .distinct()
                .toList();
    }

    private LocalDateTime latestDate(LocalDateTime first, LocalDateTime second) {
        if (first == null) return second;
        if (second == null) return first;
        return first.isAfter(second) ? first : second;
    }

    private Comparator<PhotoFolder> folderComparator() {
        return Comparator
                .comparing(PhotoFolder::getSortOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(PhotoFolder::getFolderPath);
    }

    private int nextFolderSortOrder(String ownerId) {
        return photoFolderRepository.findAllByOwnerId(ownerId)
                .stream()
                .map(PhotoFolder::getSortOrder)
                .filter(order -> order != null)
                .max(Integer::compareTo)
                .map(order -> order + 1)
                .orElse(0);
    }

    private String normalizeOwnerId(String ownerId) {
        if (ownerId == null || ownerId.isBlank()) {
            throw new IllegalArgumentException("ownerId is required.");
        }
        return ownerId.trim();
    }

    private String normalizeFolderPath(String folderPath) {
        if (folderPath == null || folderPath.isBlank()) {
            return DEFAULT_FOLDER;
        }

        String normalized = folderPath.trim().replace('\\', '/');
        normalized = normalized.replaceAll("/+", "/");
        normalized = normalized.replaceAll("^/+|/+$", "");

        if (normalized.isBlank()) {
            return DEFAULT_FOLDER;
        }

        return normalized;
    }

    public record PhotoFile(Resource resource, String contentType) {
    }

    private record DuplicatePhotoGroup(Photo keepPhoto, List<Photo> duplicatePhotos) {
    }
}
