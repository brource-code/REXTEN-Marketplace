import SwiftUI

struct BookingView: View {
    @Environment(\.appTheme) private var theme
    @Environment(\.dismiss) private var dismiss
    let profile: ServiceProfile
    @StateObject private var model: BookingViewModel

    init(profile: ServiceProfile) {
        self.profile = profile
        _model = StateObject(wrappedValue: BookingViewModel(profile: profile))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: REXLayout.Spacing.xl) {
                serviceCard
                dateSection
                slotsSection
                detailsSection
                if let err = model.errorMessage {
                    errorBanner(err)
                }
                confirmButton
            }
            .padding(REXLayout.Spacing.pagePadding)
            .padding(.bottom, REXLayout.Spacing.xxxl)
        }
        .background(theme.background.ignoresSafeArea())
        .navigationTitle("Book appointment")
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.loadSlots() }
    }

    // MARK: - Service card

    private var serviceCard: some View {
        HStack(spacing: REXLayout.Spacing.md) {
            RoundedRectangle(cornerRadius: REXLayout.Radius.sm)
                .fill(theme.primaryLight)
                .frame(width: 48, height: 48)
                .overlay(
                    Image(systemName: "scissors")
                        .font(.system(size: 22))
                        .foregroundStyle(theme.primary)
                )
            VStack(alignment: .leading, spacing: 2) {
                Text(profile.service.name)
                    .font(.subheadline.bold())
                    .foregroundStyle(theme.text)
                    .lineLimit(1)
                if !profile.service.priceLabel.isEmpty {
                    Text(profile.service.priceLabel)
                        .font(.caption.bold())
                        .foregroundStyle(theme.primary)
                }
            }
            Spacer()
        }
        .padding(REXLayout.Spacing.md)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.card))
        .overlay(RoundedRectangle(cornerRadius: REXLayout.Radius.card).stroke(theme.cardBorder, lineWidth: 1))
    }

    // MARK: - Date

    private var dateSection: some View {
        VStack(alignment: .leading, spacing: REXLayout.Spacing.sm) {
            sectionLabel("Select date", icon: "calendar")
            DatePicker("", selection: $model.selectedDate, in: Date()..., displayedComponents: .date)
                .datePickerStyle(.graphical)
                .tint(theme.primary)
                .background(theme.card)
                .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.card))
                .onChange(of: model.selectedDate) { _, _ in
                    Task { await model.loadSlots() }
                }
        }
    }

    // MARK: - Slots

    private var slotsSection: some View {
        VStack(alignment: .leading, spacing: REXLayout.Spacing.sm) {
            sectionLabel("Available times", icon: "clock")
            if model.isLoadingSlots {
                HStack { Spacer(); LoaderView(); Spacer() }
                    .padding(.vertical, REXLayout.Spacing.lg)
            } else if model.slots.isEmpty {
                Text("No available times for this date")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(theme.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, REXLayout.Spacing.xl)
            } else {
                slotGrid
            }
        }
    }

    private var slotGrid: some View {
        let columns = [GridItem(.adaptive(minimum: 76), spacing: REXLayout.Spacing.sm)]
        return LazyVGrid(columns: columns, spacing: REXLayout.Spacing.sm) {
            ForEach(model.slots, id: \.time) { slot in
                let selected = model.selectedSlot?.time == slot.time
                Button {
                    model.selectedSlot = slot
                } label: {
                    Text(slot.time)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(selected ? theme.buttonText : theme.text)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(selected ? theme.primary : theme.backgroundSecondary)
                        .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.sm))
                        .overlay(
                            RoundedRectangle(cornerRadius: REXLayout.Radius.sm)
                                .stroke(selected ? theme.primary : theme.border, lineWidth: selected ? 0 : 1)
                        )
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Client details

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: REXLayout.Spacing.sm) {
            sectionLabel("Your details", icon: "person.crop.circle")
            VStack(spacing: REXLayout.Spacing.sm) {
                bookingField(placeholder: "Full name", text: $model.clientName, type: .name)
                bookingField(placeholder: "Phone number", text: $model.clientPhone, type: .phonePad)
                bookingField(placeholder: "Email (optional)", text: $model.clientEmail, type: .emailAddress)
                bookingTextArea(placeholder: "Notes (optional)", text: $model.clientNotes)
            }
        }
    }

    private func bookingField(placeholder: String, text: Binding<String>, type: UIKeyboardType) -> some View {
        TextField(placeholder, text: text)
            .keyboardType(type)
            .autocorrectionDisabled()
            .textInputAutocapitalization(type == .emailAddress ? .never : .words)
            .font(.subheadline)
            .foregroundStyle(theme.text)
            .padding(REXLayout.Spacing.md)
            .background(theme.backgroundSecondary)
            .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.button))
            .overlay(RoundedRectangle(cornerRadius: REXLayout.Radius.button).stroke(theme.border, lineWidth: 1))
    }

    private func bookingTextArea(placeholder: String, text: Binding<String>) -> some View {
        TextField(placeholder, text: text, axis: .vertical)
            .lineLimit(3...6)
            .font(.subheadline)
            .foregroundStyle(theme.text)
            .padding(REXLayout.Spacing.md)
            .background(theme.backgroundSecondary)
            .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.button))
            .overlay(RoundedRectangle(cornerRadius: REXLayout.Radius.button).stroke(theme.border, lineWidth: 1))
    }

    // MARK: - Error

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: REXLayout.Spacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(theme.error)
            Text(message)
                .font(.caption.bold())
                .foregroundStyle(theme.error)
                .multilineTextAlignment(.leading)
            Spacer(minLength: 0)
        }
        .padding(REXLayout.Spacing.md)
        .background(theme.errorLight)
        .clipShape(RoundedRectangle(cornerRadius: REXLayout.Radius.button))
    }

    // MARK: - Confirm button

    private var confirmButton: some View {
        PrimaryButton(title: "Confirm booking", isLoading: model.isSubmitting) {
            Task {
                let ok = await model.submit()
                if ok { dismiss() }
            }
        }
    }

    // MARK: - Section label helper

    private func sectionLabel(_ title: String, icon: String) -> some View {
        Label(title, systemImage: icon)
            .font(.subheadline.bold())
            .foregroundStyle(theme.text)
    }
}
