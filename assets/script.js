// Frontend-only storage: income and expenses are saved in this browser using localStorage.
const STORAGE_KEY = 'monthlyBudgetCalculator_v1';
let state = loadState();
let editingExpenseId = null;

const $ = (id) => document.getElementById(id);
const money = (value) => 'LKR ' + Number(value || 0).toLocaleString('en-LK', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.expenses)) {
      return { income: Number(saved.income) || 0, expenses: saved.expenses };
    }
  } catch (error) {
    console.warn('Could not read saved budget data:', error);
  }
  return { income: 0, expenses: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2400);
}

function render() {
  const total = state.expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = state.income - total;

  $('incomeSummary').textContent = money(state.income);
  $('expenseSummary').textContent = money(total);
  $('balanceSummary').textContent = money(balance);

  const message = $('budgetMessage');
  if (total > state.income) {
    message.textContent = 'Warning: Your total expenses are higher than your monthly income.';
    message.className = 'budget-message warning';
    message.hidden = false;
  } else if (state.income > 0) {
    message.textContent = 'Your expenses are within your monthly income.';
    message.className = 'budget-message good';
    message.hidden = false;
  } else {
    message.hidden = true;
  }

  $('recordCount').textContent = `${state.expenses.length} record${state.expenses.length === 1 ? '' : 's'}`;
  $('emptyState').hidden = state.expenses.length > 0;

  const rows = $('expenseRows');
  rows.replaceChildren();
  [...state.expenses]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .forEach((item) => {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      name.className = 'expense-name';
      name.textContent = item.name;

      const date = document.createElement('td');
      const parsedDate = new Date(item.date + 'T00:00:00');
      date.textContent = Number.isNaN(parsedDate.getTime())
        ? item.date
        : parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      const amount = document.createElement('td');
      amount.className = 'amount-cell';
      amount.textContent = money(item.amount);

      const actions = document.createElement('td');
      const actionWrap = document.createElement('div');
      actionWrap.className = 'actions';

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'text-btn edit-btn';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => startEdit(item.id));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'text-btn delete-btn';
      remove.textContent = 'Delete';
      remove.addEventListener('click', () => deleteExpense(item.id));

      actionWrap.append(edit, remove);
      actions.append(actionWrap);
      tr.append(name, date, amount, actions);
      rows.append(tr);
    });
}

function resetExpenseForm() {
  editingExpenseId = null;
  $('expenseForm').reset();
  $('expenseDate').value = new Date().toISOString().slice(0, 10);
  $('expenseFormTitle').textContent = 'Add Expense';
  $('expenseSubmit').textContent = 'Add Expense';
  $('cancelEdit').hidden = true;
}

function startEdit(id) {
  const item = state.expenses.find((expense) => expense.id === id);
  if (!item) return;
  editingExpenseId = id;
  $('expenseName').value = item.name;
  $('expenseAmount').value = item.amount;
  $('expenseDate').value = item.date;
  $('expenseFormTitle').textContent = 'Edit Expense';
  $('expenseSubmit').textContent = 'Update Expense';
  $('cancelEdit').hidden = false;
  $('expenseName').focus();
  window.scrollTo({ top: $('expenseForm').getBoundingClientRect().top + window.scrollY - 25, behavior: 'smooth' });
}

function deleteExpense(id) {
  const item = state.expenses.find((expense) => expense.id === id);
  if (!item || !window.confirm(`Delete "${item.name}"?`)) return;
  state.expenses = state.expenses.filter((expense) => expense.id !== id);
  saveState();
  render();
  if (editingExpenseId === id) resetExpenseForm();
  showToast('Expense deleted.');
}

$('incomeForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const income = Number($('monthlyIncome').value);
  if (!Number.isFinite(income) || income <= 0) {
    showToast('Enter an income greater than zero.');
    return;
  }
  state.income = income;
  saveState();
  render();
  showToast('Monthly income saved.');
});

$('expenseForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $('expenseName').value.trim();
  const amount = Number($('expenseAmount').value);
  const date = $('expenseDate').value;

  if (!name || name.length > 100) {
    showToast('Enter an expense name (up to 100 characters).');
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast('Enter an amount greater than zero.');
    return;
  }
  if (!date) {
    showToast('Choose an expense date.');
    return;
  }

  if (editingExpenseId !== null) {
    const item = state.expenses.find((expense) => expense.id === editingExpenseId);
    if (item) Object.assign(item, { name, amount, date });
    showToast('Expense updated.');
  } else {
    state.expenses.push({ id: Date.now(), name, amount, date });
    showToast('Expense added.');
  }

  saveState();
  render();
  resetExpenseForm();
});

$('cancelEdit').addEventListener('click', resetExpenseForm);

$('monthLabel').textContent = new Date().toLocaleDateString('en-US', {
  month: 'long', year: 'numeric'
});
$('monthlyIncome').value = state.income > 0 ? state.income : '';
$('expenseDate').value = new Date().toISOString().slice(0, 10);
render();
