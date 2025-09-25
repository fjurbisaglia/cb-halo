import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { SettingsService } from '../../services/settings.service';
import { Settings } from '../../interfaces/settings.interface';
import { finalize, take } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSliderModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private settingsService = inject(SettingsService);
  private snackBar = inject(MatSnackBar);

  settingsForm!: FormGroup;
  isLoading = signal(false);
  isFirstTime = signal(true);

  ngOnInit(): void {
    this.initializeForm();
    this.loadSettings();
  }

  private initializeForm(): void {
    this.settingsForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      companySlogan: ['', [Validators.required, Validators.minLength(5)]],
      companyIndustry: ['', [Validators.required, Validators.minLength(2)]],
      botName: ['', [Validators.required, Validators.minLength(2)]],
      tone: this.fb.array([], [Validators.required, Validators.minLength(1)]),
      temperature: [0.7, [Validators.required, Validators.min(0), Validators.max(1)]]
    });
  }

  private loadSettings(): void {
    this.isLoading.set(true);

    this.settingsService.getSettings()
      .pipe(
        take(1),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (settings) => {
          if (settings) {
            this.isFirstTime.set(false);
            this.populateForm(settings);
          } else {
            this.isFirstTime.set(true);
            this.addToneChip(); // Add at least one tone field for new settings
          }
        },
        error: (error) => {
          console.error('Error loading settings:', error);
          this.snackBar.open('Error loading settings', 'Close', { duration: 3000 });
          this.addToneChip(); // Add at least one tone field on error
        }
      });
  }

  private populateForm(settings: Settings): void {
    this.settingsForm.patchValue({
      companyName: settings.companyName,
      companySlogan: settings.companySlogan,
      companyIndustry: settings.companyIndustry,
      botName: settings.botName,
      temperature: settings.temperature ?? 0.7
    });

    // Clear existing tone controls and add the loaded ones
    const toneArray = this.toneFormArray;
    toneArray.clear();
    settings?.tone?.forEach(tone => {
      toneArray.push(this.fb.control(tone, [Validators.required]));
    });
  }

  get toneFormArray(): FormArray {
    return this.settingsForm.get('tone') as FormArray;
  }

  addToneChip(): void {
    this.toneFormArray.push(this.fb.control('', [Validators.required]));
  }

  removeToneChip(index: number): void {
    if (this.toneFormArray.length > 1) {
      this.toneFormArray.removeAt(index);
    }
  }

  onSubmit(): void {
    if (this.settingsForm.valid) {
      this.isLoading.set(true);

      const formValue = this.settingsForm.value;
      const settings: Settings = {
        companyName: formValue.companyName,
        companySlogan: formValue.companySlogan,
        companyIndustry: formValue.companyIndustry,
        botName: formValue.botName,
        tone: formValue.tone.filter((t: string) => t.trim() !== ''),
        temperature: formValue.temperature
      };

      this.settingsService.saveSettings(settings)
        .pipe(
          take(1),
          finalize(() => this.isLoading.set(false))
        )
        .subscribe({
          next: () => {
            const message = this.isFirstTime()
              ? 'Settings created successfully!'
              : 'Settings updated successfully!';
            this.snackBar.open(message, 'Close', { duration: 3000 });
            this.isFirstTime.set(false);
          },
          error: (error) => {
            console.error('Error saving settings:', error);
            this.snackBar.open('Error saving settings', 'Close', { duration: 3000 });
          }
        });
    } else {
      this.markFormGroupTouched();
      this.snackBar.open('Please fill in all required fields correctly', 'Close', { duration: 3000 });
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.settingsForm.controls).forEach(key => {
      const control = this.settingsForm.get(key);
      control?.markAsTouched();

      if (control instanceof FormArray) {
        control.controls.forEach(c => c.markAsTouched());
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.settingsForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['min']) return `${fieldName} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${fieldName} must be at most ${field.errors['max'].max}`;
    }
    return '';
  }

  getToneError(index: number): string {
    const toneControl = this.toneFormArray.at(index);
    if (toneControl?.errors && toneControl.touched) {
      if (toneControl.errors['required']) return 'Tone is required';
    }
    return '';
  }
}
