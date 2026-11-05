import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientProfilePage } from './pages/ClientProfilePage';
import { GuarantorsPage } from './pages/GuarantorsPage';
import { LoansPage } from './pages/LoansPage';
import { LoanDetailPage } from './pages/LoanDetailPage';
import { RepaymentsPage } from './pages/RepaymentsPage';
import { RolloversPage } from './pages/RolloversPage';
import { LoanBooksPage } from './pages/LoanBooksPage';
import { CashbookPage } from './pages/CashbookPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

import { NewClientModal } from './components/NewClientModal';
import { NewLoanModal } from './components/NewLoanModal';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { RolloverModal } from './components/RolloverModal';
import { PaymentReversalModal } from './components/PaymentReversalModal';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">Loading LMS...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function App() {
  // Global modal state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [preselectedClientId, setPreselectedClientId] = useState(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [preselectedLoanId, setPreselectedLoanId] = useState(null);

  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [rolloverLoanId, setRolloverLoanId] = useState(null);

  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
  const [selectedPaymentForReversal, setSelectedPaymentForReversal] = useState(null);

  const handleOpenNewLoan = (clientId = null) => {
    setPreselectedClientId(clientId);
    setIsLoanModalOpen(true);
  };

  const handleOpenRecordPayment = (loanId = null) => {
    setPreselectedLoanId(loanId);
    setIsPaymentModalOpen(true);
  };

  const handleOpenRollover = (loanId) => {
    setRolloverLoanId(loanId);
    setIsRolloverModalOpen(true);
  };

  const handleOpenReversal = (payment) => {
    setSelectedPaymentForReversal(payment);
    setIsReversalModalOpen(true);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout
                  onOpenNewClient={() => setIsClientModalOpen(true)}
                  onOpenNewLoan={() => handleOpenNewLoan()}
                  onOpenRecordPayment={() => handleOpenRecordPayment()}
                />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={
                <DashboardPage
                  onOpenNewClient={() => setIsClientModalOpen(true)}
                  onOpenNewLoan={handleOpenNewLoan}
                  onOpenRecordPayment={handleOpenRecordPayment}
                />
              }
            />
            <Route
              path="clients"
              element={
                <ClientsPage
                  onOpenNewClient={() => setIsClientModalOpen(true)}
                  onOpenNewLoan={handleOpenNewLoan}
                />
              }
            />
            <Route
              path="clients/:id"
              element={
                <ClientProfilePage
                  onOpenNewLoan={handleOpenNewLoan}
                  onOpenRecordPayment={handleOpenRecordPayment}
                />
              }
            />
            <Route path="guarantors" element={<GuarantorsPage />} />
            <Route
              path="loans"
              element={
                <LoansPage
                  onOpenNewLoan={() => handleOpenNewLoan()}
                  onOpenRecordPayment={handleOpenRecordPayment}
                  onOpenRollover={handleOpenRollover}
                />
              }
            />
            <Route
              path="loans/:id"
              element={
                <LoanDetailPage
                  onOpenRecordPayment={handleOpenRecordPayment}
                  onOpenRollover={handleOpenRollover}
                />
              }
            />
            <Route
              path="repayments"
              element={
                <RepaymentsPage
                  onOpenRecordPayment={() => handleOpenRecordPayment()}
                  onOpenReversal={handleOpenReversal}
                />
              }
            />
            <Route
              path="rollovers"
              element={
                <RolloversPage
                  onOpenRollover={handleOpenRollover}
                />
              }
            />
            <Route path="loan-books" element={<LoanBooksPage />} />
            <Route path="cashbook" element={<CashbookPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global Modals */}
        <NewClientModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onClientCreated={() => window.location.reload()}
        />

        <NewLoanModal
          isOpen={isLoanModalOpen}
          preselectedClientId={preselectedClientId}
          onClose={() => setIsLoanModalOpen(false)}
          onLoanCreated={() => window.location.reload()}
        />

        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          preselectedLoanId={preselectedLoanId}
          onClose={() => setIsPaymentModalOpen(false)}
          onPaymentRecorded={() => window.location.reload()}
        />

        <RolloverModal
          isOpen={isRolloverModalOpen}
          loanId={rolloverLoanId}
          onClose={() => setIsRolloverModalOpen(false)}
          onRolloverComplete={() => window.location.reload()}
        />

        <PaymentReversalModal
          isOpen={isReversalModalOpen}
          payment={selectedPaymentForReversal}
          onClose={() => setIsReversalModalOpen(false)}
          onReversalComplete={() => window.location.reload()}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

