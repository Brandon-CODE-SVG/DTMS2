package com.brandon.dtms2.repository;

import com.brandon.dtms2.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.role = 'MEMBER' ORDER BY u.firstName, u.lastName")
    List<User> findAllMembers();

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = 'MEMBER'")
    Long countMembers();

    @Query("SELECT u FROM User u WHERE u.role = 'INSTRUCTOR'")
    List<User> findAllInstructors();
}