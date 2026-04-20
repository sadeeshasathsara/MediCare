package com.healthcare.doctor.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class CreateAvailabilityRequest {

    @NotEmpty(message = "At least one slot is required")
    @Valid
    private List<SlotRequest> slots;

    public List<SlotRequest> getSlots() {
        return slots;
    }

    public void setSlots(List<SlotRequest> slots) {
        this.slots = slots;
    }

    public static class SlotRequest {

        @NotBlank(message = "dayOfWeek is required")
        private String dayOfWeek;

        @NotBlank(message = "startTime is required (HH:mm)")
        private String startTime;

        @NotBlank(message = "endTime is required (HH:mm)")
        private String endTime;

        private int maxCapacity = 1;

        public String getDayOfWeek() {
            return dayOfWeek;
        }

        public void setDayOfWeek(String dayOfWeek) {
            this.dayOfWeek = dayOfWeek;
        }

        public String getStartTime() {
            return startTime;
        }

        public void setStartTime(String startTime) {
            this.startTime = startTime;
        }

        public String getEndTime() {
            return endTime;
        }

        public void setEndTime(String endTime) {
            this.endTime = endTime;
        }

        public int getMaxCapacity() {
            return maxCapacity;
        }

        public void setMaxCapacity(int maxCapacity) {
            this.maxCapacity = maxCapacity;
        }
    }
}
