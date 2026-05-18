import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Transaction } from "@/types"

interface TransactionDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
}

export function TransactionDetailDialog({ isOpen, onClose, transaction }: TransactionDetailDialogProps) {
  if (!transaction) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>Detailed information about transaction #{transaction.id}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Transaction ID</TableCell>
                <TableCell>{transaction.transaction_id || "N/A"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Type</TableCell>
                <TableCell className="capitalize">{transaction.type}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Status</TableCell>
                <TableCell className="capitalize">{transaction.status}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Amount</TableCell>
                <TableCell>{`${transaction.currency} ${transaction.amount.toFixed(2)}`}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Fee</TableCell>
                <TableCell>{`${transaction.currency} ${transaction.fee.toFixed(2)}`}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Payment Method</TableCell>
                <TableCell>{transaction.payment_method || "N/A"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Processed At</TableCell>
                <TableCell>{new Date(transaction.processed_at).toLocaleString()}</TableCell>
              </TableRow>
              {transaction.meta && Object.keys(transaction.meta).length > 0 && (
                <TableRow>
                  <TableCell className="font-medium">Meta Data</TableCell>
                  <TableCell>
                    <pre className="whitespace-pre-wrap text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                      {JSON.stringify(transaction.meta, null, 2)}
                    </pre>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
