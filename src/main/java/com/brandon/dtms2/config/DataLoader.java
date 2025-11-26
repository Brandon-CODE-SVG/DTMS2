package com.brandon.dtms2.config;

import com.brandon.dtms2.entity.User;
import com.brandon.dtms2.entity.Machine;
import com.brandon.dtms2.repository.UserRepository;
import com.brandon.dtms2.repository.MachineRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

@Component
public class DataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final MachineRepository machineRepository;
    private final PasswordEncoder passwordEncoder;

    public DataLoader(UserRepository userRepository,
                      MachineRepository machineRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.machineRepository = machineRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        createDefaultUsers();
        createDefaultMachines();
    }

    private void createDefaultUsers() {
        // Delete existing users to start fresh
        userRepository.deleteAll();

        // Create admin user
        User admin = new User();
        admin.setUsername("admin");
        admin.setPassword(passwordEncoder.encode("admin123")); // MUST USE ENCODER
        admin.setEmail("admin@twendefitness.com");
        admin.setFirstName("System");
        admin.setLastName("Administrator");
        admin.setRole(User.UserRole.ADMIN);
        admin.setCreatedAt(LocalDateTime.now());
        admin.setUpdatedAt(LocalDateTime.now());
        userRepository.save(admin);
        System.out.println("✅ Default admin user created: admin/admin123");
        System.out.println("🔐 Admin password encoded: " + admin.getPassword().startsWith("$2a$"));

        // Create instructor user
        User instructor = new User();
        instructor.setUsername("instructor");
        instructor.setPassword(passwordEncoder.encode("instructor123")); // MUST USE ENCODER
        instructor.setEmail("instructor@twendefitness.com");
        instructor.setFirstName("Fitness");
        instructor.setLastName("Instructor");
        instructor.setRole(User.UserRole.INSTRUCTOR);
        instructor.setCreatedAt(LocalDateTime.now());
        instructor.setUpdatedAt(LocalDateTime.now());
        userRepository.save(instructor);
        System.out.println("✅ Default instructor user created: instructor/instructor123");
        System.out.println("🔐 Instructor password encoded: " + instructor.getPassword().startsWith("$2a$"));

        // Create member user
        User member = new User();
        member.setUsername("member");
        member.setPassword(passwordEncoder.encode("member123")); // MUST USE ENCODER
        member.setEmail("member@twendefitness.com");
        member.setFirstName("John");
        member.setLastName("Member");
        member.setRole(User.UserRole.MEMBER);
        member.setCreatedAt(LocalDateTime.now());
        member.setUpdatedAt(LocalDateTime.now());
        userRepository.save(member);
        System.out.println("✅ Sample member user created: member/member123");
        System.out.println("🔐 Member password encoded: " + member.getPassword().startsWith("$2a$"));
    }



    private void createDefaultMachines() {
        if (machineRepository.count() == 0) {
            String[] machineNames = {"Treadmill-001", "Exercise-Bike-001", "Elliptical-001", "Rowing-Machine-001"};
            String[] machineTypes = {"Treadmill", "Exercise Bike", "Elliptical", "Rowing Machine"};
            String[] locations = {"Main Floor - Zone A", "Cardio Zone", "Main Floor - Zone B", "Strength Area"};

            for (int i = 0; i < machineNames.length; i++) {
                Machine machine = new Machine();
                machine.setName(machineNames[i]);
                machine.setType(machineTypes[i]);
                machine.setLocation(locations[i]);
                machine.setStatus("ACTIVE");
                machine.setLastMaintenance(LocalDateTime.now().minusDays(30));
                machine.setCreatedAt(LocalDateTime.now());
                machineRepository.save(machine);
            }
            System.out.println("Default machines created");
        }
    }
}
