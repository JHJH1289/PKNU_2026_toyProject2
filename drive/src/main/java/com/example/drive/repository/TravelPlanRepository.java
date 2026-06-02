package com.example.drive.repository;

import com.example.drive.entity.TravelPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TravelPlanRepository extends JpaRepository<TravelPlan, Long> {
    List<TravelPlan> findAllByOwnerIdOrderByCreatedAtDescIdDesc(String ownerId);
    Optional<TravelPlan> findByIdAndOwnerId(Long id, String ownerId);
}
