import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { Insurance } from '../../interfaces/insurance.interface';
import { InsuranceService } from '../../services/insurance.service';
import { DialogData, InsuranceDialogComponent } from './insurance-dialog/insurance-dialog.component';

@Component({
  selector: 'app-insurances.component',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './insurances.component.html',
  styleUrl: './insurances.component.scss',
})
export class InsurancesComponent implements OnInit {
  private insuranceService = inject(InsuranceService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  insurances$: Observable<Insurance[]> = this.insuranceService.getInsurances();
  displayedColumns: string[] = ['name', 'description', 'pricePerDay', 'currency', 'amountCovered', 'region', 'actions'];

  ngOnInit(): void {
    this.loadInsurances();
  }

  loadInsurances(): void {
    this.insurances$ = this.insuranceService.getInsurances();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(InsuranceDialogComponent, {
      width: '700px',
      data: { mode: 'create' } as DialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.insuranceService.createInsurance(result).subscribe({
          next: () => {
            this.snackBar.open('Insurance created successfully', 'Close', { duration: 3000 });
            this.loadInsurances();
          },
          error: (error) => {
            this.snackBar.open('Error creating insurance', 'Close', { duration: 3000 });
            console.error('Error creating insurance:', error);
          }
        });
      }
    });
  }

  openEditDialog(insurance: Insurance): void {
    const dialogRef = this.dialog.open(InsuranceDialogComponent, {
      width: '500px',
      data: { mode: 'edit', insurance } as DialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && insurance.id) {
        this.insuranceService.updateInsurance(insurance.id, result).subscribe({
          next: () => {
            this.snackBar.open('Insurance updated successfully', 'Close', { duration: 3000 });
            this.loadInsurances();
          },
          error: (error) => {
            this.snackBar.open('Error updating insurance', 'Close', { duration: 3000 });
            console.error('Error updating insurance:', error);
          }
        });
      }
    });
  }

  deleteInsurance(insurance: Insurance): void {
    if (insurance.id) {
      this.insuranceService.deleteInsurance(insurance.id).subscribe({
        next: () => {
          this.snackBar.open('Insurance deleted successfully', 'Close', { duration: 3000 });
          this.loadInsurances();
        },
        error: (error) => {
          this.snackBar.open('Error deleting insurance', 'Close', { duration: 3000 });
          console.error('Error deleting insurance:', error);
        }
      });
    }
  }
}
