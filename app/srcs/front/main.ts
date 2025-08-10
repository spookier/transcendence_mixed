export {}

const loginForm = document.getElementById('login-form') as HTMLFormElement;
const registerForm = document.getElementById('register-form') as HTMLFormElement;
const showRegisterBtn = document.getElementById('show-register') as HTMLButtonElement;
const homeSection = document.getElementById('home-section') as HTMLDivElement;
const gameSection = document.getElementById('game-section') as HTMLDivElement;
const profileSection = document.getElementById('profile-section') as HTMLDivElement;
const goGameBtn = document.getElementById('go-game') as HTMLButtonElement | null;
const backHomeBtn = document.getElementById('accueil') as HTMLButtonElement | null;
const goProfileBtn = document.getElementById('go-profile') as HTMLButtonElement | null;
const backHomeProfileBtn = document.getElementById('back-home-profile') as HTMLButtonElement | null;
const profileForm = document.getElementById('profile-form') as HTMLFormElement | null;
const profileEmail = document.getElementById('profile-email') as HTMLInputElement | null;
const profileDisplayName = document.getElementById('profile-displayName') as HTMLInputElement | null;
const profileAvatar = document.getElementById('profile-avatar') as HTMLInputElement | null;
const profileAvatarImg = document.getElementById('profile-avatar-img') as HTMLImageElement | null;
const regAvatar = document.getElementById('reg-avatar') as HTMLInputElement | null;
const searchUserInput = document.getElementById('search-user-input') as HTMLInputElement | null;
const searchUserBtn = document.getElementById('search-user-btn') as HTMLButtonElement | null;
const searchUserResult = document.getElementById('search-user-result') as HTMLDivElement | null;
const publicProfileSection = document.getElementById('public-profile-section') as HTMLDivElement | null;
const publicProfileAvatarImg = document.getElementById('public-profile-avatar-img') as HTMLImageElement | null;
const publicProfileEmail = document.getElementById('public-profile-email') as HTMLSpanElement | null;
const publicProfileDisplayName = document.getElementById('public-profile-displayName') as HTMLSpanElement | null;
const backProfileBtn = document.getElementById('back-profile-btn') as HTMLButtonElement | null;
const addFriendBtn = document.getElementById('add-friend-btn') as HTMLButtonElement | null;
const log_page = document.getElementById('c-page') as HTMLDivElement | null;
const page_acc = document.getElementById('page-accueil') as HTMLDivElement | null;
const canvas = document.getElementById('pong') as HTMLCanvasElement;
const pongpage = document.getElementById('pong-game') as HTMLDivElement | null;
const bg_blur = document.getElementById('blur-bg') as HTMLDivElement | null;
const profileHistory = document.getElementById('profile-history') as HTMLDivElement | null;

let pingInterval: number | undefined;


pingInterval = setInterval(async () => {
  const userId = localStorage.getItem('userId');
  if (userId) {
    console.log('Pinging server for user:', userId);
    await fetch('/api/ping', {
      method: 'POST',
      headers: { 'X-User-Id': userId }
    });
  }
}, 10_000);

function showView(view: 'login' | 'register' | 'home' | 'game' | 'profile' | 'public-profile', push = true, publicUser?: any) {
  loginForm.classList.add('hidden');
  registerForm.classList.add('hidden');
  homeSection.classList.add('hidden');
  gameSection.classList.add('hidden');
  profileSection.classList.add('hidden');
  pongpage?.classList.add('hidden');
  bg_blur?.classList.add('hidden');
  publicProfileSection?.classList.add('hidden');
  

  if (page_acc) page_acc.classList.add('hidden');
  if (log_page) log_page.classList.add('hidden');
  if (view === 'login') {
    log_page?.classList.remove('hidden');
    loginForm.classList.remove('hidden');
    showRegisterBtn.classList.remove('hidden');
  } else if (view === 'register') {
    log_page?.classList.remove('hidden');
    registerForm.classList.remove('hidden');
    showRegisterBtn.classList.add('hidden');
  } else if (view === 'home') {
    page_acc?.classList.remove('hidden');
    homeSection.classList.remove('hidden');
    showRegisterBtn.classList.add('hidden');
    log_page?.classList.add('hidden');
    drawHomePong();
    fetch('/api/me')
      .then(res => res.json())
      .then(user => {
        const avatarImg = document.getElementById('user-avatar') as HTMLImageElement;
        if (avatarImg) {
          avatarImg.src = (user.avatar || '/avatars/default.png') + '?t=' + Date.now();
        }
        const displayNameSpan = document.getElementById('user-displayName') as HTMLSpanElement;
        if (displayNameSpan) {
          displayNameSpan.textContent = user.displayName || 'Inconnu';
        }
      });
    addLogoutButton();
  } else if (view === 'game') {
    let vs_player = document.getElementById('vs-player') as HTMLButtonElement | null;

    homeSection.classList.remove('hidden');
    gameSection.classList.remove('hidden');
    showRegisterBtn.classList.add('hidden');
    vs_player?.addEventListener('click', () => 
    {
      canvas.classList.add('hidden');
      gameSection.classList.add('hidden');
      pongpage?.classList.remove('hidden');
      if (!canvas) {
        console.error('Canvas not found');
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }
      // ajout d'un boutton pour commencer le matchmaking
      let blurm_bg = document.getElementById('blurm-bg') as HTMLDivElement;
      const startMatchmakingBtn = document.createElement('button');
      startMatchmakingBtn.textContent = 'Commencer le matchmaking';
      startMatchmakingBtn.classList.add('bg-gray-900', 'text-white', 'px-4', 'py-2', 'rounded', 'border', 'border-gray-700', 'hover:bg-gray-800');
      startMatchmakingBtn.style.position = 'absolute';
      startMatchmakingBtn.style.top = '10px';
      startMatchmakingBtn.style.right = '10px';
      pongpage?.appendChild(startMatchmakingBtn);
      startMatchmakingBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (blurm_bg) {
          blurm_bg.classList.remove('hidden');
        }
        let ws: WebSocket;
        let playernumber: number | null = null;
        let gameState: any = null;
        let animationId: number | null = null;
        let finished: boolean = false;
        ws = new WebSocket('ws://localhost:8081');
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'join' }));
        };
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'match_found') {
            if (blurm_bg) {
              blurm_bg.classList.add('hidden');
            }
            canvas.classList.remove('hidden');
            playernumber = data.playernumber;
            startPongGame();
          } else if (data.type === 'game_state') {
            gameState = data.state;
          } else if (data.type === 'opponent_left') {
            alert('Ton adversaire a quitté la partie.');
            if (animationId) cancelAnimationFrame(animationId);
            showView('home');
          }
          else if (data.type === 'loser') {
            if (finished) return;
            finished = true;
            let loserpopup = document.getElementById('loser-popup') as HTMLDivElement;
            if (loserpopup) {
              loserpopup.classList.remove('hidden');
              const loserScore = document.getElementById('loser-score') as HTMLSpanElement;
              let btnfermer = document.getElementById('fermer-loser') as HTMLButtonElement;
              if (loserScore) {
                loserScore.textContent = `${data.score1} - ${data.score2}`;
              }
              if (btnfermer) {
                btnfermer.addEventListener('click', () => {
                  loserpopup.classList.add('hidden');
                  showView('game');
                });
              }
            }
            if (animationId) cancelAnimationFrame(animationId);
            return;
          }
          else if (data.type === 'winner') {
            if (finished) return; 
            finished = true;
            let winnerpopup = document.getElementById('winner-popup') as HTMLDivElement;
            let btnfermer = document.getElementById('fermer') as HTMLButtonElement;
            if (winnerpopup) {
              winnerpopup.classList.remove('hidden');
              const winnerScore = document.getElementById('winner-score') as HTMLSpanElement;
              if (winnerScore) {
                winnerScore.textContent = `${data.score1} - ${data.score2}`;
              }
              if (btnfermer) {
                btnfermer.addEventListener('click', () => {
                  winnerpopup.classList.add('hidden');
                  showView('game');
                });
              }
            }
            if (animationId) cancelAnimationFrame(animationId);
            return;
          }
        };
        ws.onclose = () => {
          if (animationId) cancelAnimationFrame(animationId);
        };

        function startPongGame() {
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          let paddleY = 150;
          const paddleH = 80;
          const paddleW = 10;
          const height = 400;
          const width = 800;
          function draw() {
            if (!gameState || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.setLineDash([10, 10]);
            ctx.moveTo(canvas.width/2, 0); ctx.lineTo(canvas.width/2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);
            // Raquettes
            ctx.fillStyle = '#fff';
            ctx.fillRect(20, gameState.paddle1.y, paddleW, paddleH);
            ctx.fillRect(canvas.width-30, gameState.paddle2.y, paddleW, paddleH);
            // Balle
            ctx.beginPath();
            ctx.arc(gameState.ball.x, gameState.ball.y, 10, 0, 2*Math.PI);
            ctx.fill();
            // Score
            ctx.font = '32px Arial';
            ctx.fillText(gameState.score1, canvas.width/2-50, 40);
            ctx.fillText(gameState.score2, canvas.width/2+30, 40);
          }
          function gameLoop() {
            draw();
            animationId = requestAnimationFrame(gameLoop);
          }
          gameLoop();
          // Mouvement raquette (flèches ou Z/S)
          function onKey(e: KeyboardEvent) {
            if (!playernumber) return;
            let changed = false;
            if (playernumber === 1) {
              if (e.key === 'ArrowUp' || e.key === 'z' || e.key === 'Z') { paddleY -= 10; changed = true; }
              if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { paddleY += 10; changed = true; }
            } else if (playernumber === 2) {
              if (e.key === 'ArrowUp' || e.key === 'z' || e.key === 'Z') { paddleY -= 10; changed = true; }
              if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { paddleY += 10; changed = true; }
            }
            paddleY = Math.max(0, Math.min(canvas.height-paddleH, paddleY));
            if (changed) {
              ws.send(JSON.stringify({ type: 'paddle_move', y: paddleY }));
            }
          }
          window.addEventListener('keydown', onKey);
        }
      });
    });

  } else if (view === 'profile') {
    bg_blur?.classList.remove('hidden');
    homeSection.classList.remove('hidden');
    profileSection.classList.remove('hidden');
    showRegisterBtn.classList.add('hidden');
    fetch('/api/me').then(res => res.json()).then(user => {
      if (profileEmail && profileDisplayName) {
        profileEmail.value = user.email;
        profileDisplayName.value = user.displayName;
        if (profileAvatarImg) {
          profileAvatarImg.src = (user.avatar && user.avatar !== null ? user.avatar : '/avatars/default.png') + '?t=' + Date.now();
        }
      }
      renderFriendsList();
      renderFriendRequests();
      addLogoutButton();
    });
  } else if (view === 'public-profile' && publicUser) {
    homeSection.classList.remove('hidden');
    bg_blur?.classList.remove('hidden');
    if (publicProfileSection) publicProfileSection.classList.remove('hidden');
    if (publicProfileAvatarImg) publicProfileAvatarImg.src = (publicUser.avatar || '/avatars/default.png') + '?t=' + Date.now();
    if (publicProfileEmail) publicProfileEmail.textContent = publicUser.email;
    if (publicProfileDisplayName) publicProfileDisplayName.textContent = publicUser.displayName;

    let statusDot = document.getElementById('public-profile-status-dot');
    let statusText = document.getElementById('public-profile-status-text');
    if (!statusDot) {
      statusDot = document.createElement('span');
      statusDot.id = 'public-profile-status-dot';
      statusDot.style.display = 'inline-block';
      statusDot.style.width = '12px';
      statusDot.style.height = '12px';
      statusDot.style.borderRadius = '50%';
      statusDot.style.marginLeft = '8px';
      publicProfileAvatarImg?.parentElement?.insertBefore(statusDot, publicProfileAvatarImg.nextSibling);
    }
    if (!statusText) {
      statusText = document.createElement('span');
      statusText.className = 'text-white';
      statusText.id = 'public-profile-status-text';
      statusText.style.marginLeft = '6px';
      statusDot?.parentElement?.insertBefore(statusText, statusDot.nextSibling);
    }
    statusDot.style.backgroundColor = publicUser.online ? '#22c55e' : '#ef4444'; // vert/rouge
    statusText.textContent = publicUser.online ? 'en ligne' : 'hors ligne';

    fetch('/api/me')
      .then(res => res.json())
      .then(me => {
        if (addFriendBtn) {
          if (me && me.displayName && publicUser.displayName && me.displayName !== publicUser.displayName) {
            addFriendBtn.classList.remove('hidden');
            addFriendBtn.setAttribute('data-userid', publicUser.id);
          } else {
            addFriendBtn.classList.add('hidden');
            addFriendBtn.removeAttribute('data-userid');
          }
        }
      });
  } else {
    if (addFriendBtn) {
      addFriendBtn.classList.add('hidden');
      addFriendBtn.removeAttribute('data-userid');
    }
  }

  if (push) {
    history.pushState({ view }, '', view === 'login' ? '/' : `/${view}`);
  }

  if (view === 'login') {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = undefined;
    }
    localStorage.removeItem('userId');
  } else {
    if (!pingInterval) {
      pingInterval = setInterval(async () => {
        const userId = localStorage.getItem('userId');
        if (userId) {
          await fetch('/api/ping', {
            method: 'POST',
            headers: { 'X-User-Id': userId }
          });
        }
      }, 10_000) as unknown as number;
    }
  }
}

showRegisterBtn.addEventListener('click', () => {
  showView('register');
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (document.getElementById('reg-email') as HTMLInputElement).value.trim();
  const password = (document.getElementById('reg-password') as HTMLInputElement).value.trim();
  const displayName = (document.getElementById('reg-displayName') as HTMLInputElement).value.trim();
  if (!email || !password || !displayName) {
    alert('Veuillez remplir tous les champs.');
    return;
  }
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  });
  if (res.ok) {
    const user = await res.json();
    if (regAvatar && regAvatar.files && regAvatar.files[0]) {
      const formData = new FormData();
      formData.append('file', regAvatar.files[0]);
      formData.append('userId', user.id);
      await fetch('/api/me/avatar', {
        method: 'POST',
        body: formData
      });
    }
    const loginRes = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (loginRes.ok){
      alert('Compte créé, veuillez vous connecter.');
      showView('login');
    }
  } else {
    const data = await res.json();
    alert(data.error || 'Erreur lors de la création du compte');
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (document.getElementById('email') as HTMLInputElement).value.trim();
  const password = (document.getElementById('password') as HTMLInputElement).value.trim();
  if (!email || !password) {
    alert('Veuillez remplir tous les champs.');
    return;
  }
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (res.ok) {
    const user = await res.json();
    localStorage.setItem('userId', user.id);
    showView('home');
  } else {
    const data = await res.json();
    alert(data.error || 'Erreur de connexion');
  }
});

if (goGameBtn) {
  goGameBtn.addEventListener('click', () => {
    showView('game');
  });
}

if (backHomeBtn) {
  backHomeBtn.addEventListener('click', () => {
    showView('home');
  });
}

if (goProfileBtn) {
  goProfileBtn.addEventListener('click', () => {
    showView('profile');
  });
}

if (backHomeProfileBtn) {
  backHomeProfileBtn.addEventListener('click', () => {
    showView('home');
  });
}

if (profileForm) {
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!profileEmail || !profileDisplayName) return;
    const email = profileEmail.value.trim();
    const displayName = profileDisplayName.value.trim();

    // Vérification taille avatar
    if (profileAvatar && profileAvatar.files && profileAvatar.files[0]) {
      if (profileAvatar.files[0].size > 50 * 1024) {
        alert('Avatar trop volumineux (max 50kb).');
        return;
      }
    }

    const res = await fetch('/api/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, displayName })
    });
    let avatarUrl: string | undefined;
    if (profileAvatar && profileAvatar.files && profileAvatar.files[0]) {
      const userRes = await fetch('/api/me');
      const user = await userRes.json();
      const formData = new FormData();
      formData.append('file', profileAvatar.files[0]);
      const avatarRes = await fetch('/api/me/avatar', {
        method: 'POST',
        body: formData
      });
      if (avatarRes.ok) {
        const data = await avatarRes.json();
        avatarUrl = data.avatar;
      }
    }
    if (res.ok) {
      alert('Profil mis à jour !');
      if (avatarUrl && profileAvatarImg) {
        profileAvatarImg.src = avatarUrl + '?t=' + Date.now();
      }
      showView('profile', false);
    } else {
      const data = await res.json();
      alert(data.error || 'Erreur lors de la mise à jour');
    }
  });
}

if (searchUserBtn && searchUserInput && searchUserResult) {
  searchUserBtn.addEventListener('click', async () => {
    const displayName = searchUserInput.value.trim();
    searchUserResult.innerHTML = '';
    if (!displayName) {
      searchUserResult.textContent = 'Veuillez entrer un pseudo.';
      return;
    }
    const res = await fetch(`/api/user/${encodeURIComponent(displayName)}`);
    if (res.ok) {
      const user = await res.json();
      searchUserResult.innerHTML = `
        <div class="flex items-center mb-2">
          <img src="${user.avatar || '/avatars/default.png'}?t=${Date.now()}" alt="Avatar" class="w-10 h-10 rounded-full mr-2">
          <span class="font-bold">${user.displayName}</span>
        </div>
        <button id="view-public-profile" class="bg-blue-500 text-white px-4 py-2 rounded w-full">Voir le profil</button>
      `;
      const viewBtn = document.getElementById('view-public-profile');
      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          showView('public-profile', true, user);
        });
      }
    } else {
      searchUserResult.textContent = 'Utilisateur non trouvé.';
    }
  });
}

if (backProfileBtn) {
  backProfileBtn.addEventListener('click', () => {
    showView('profile');
    renderFriendsList();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const deleteAvatarBtn = document.getElementById('delete-avatar');
  if (deleteAvatarBtn) {
    deleteAvatarBtn.addEventListener('click', async () => {
      await fetch('/api/me/avatar', { method: 'DELETE' });
      showView('profile', false);
    });
  }

  const tabInfo = document.getElementById('profile-tab-info');
  const tabHistory = document.getElementById('profile-tab-history');
  const infoPanel = document.getElementById('profile-info-panel');
  const historyPanel = document.getElementById('profile-history-panel');
  if (tabInfo && tabHistory && infoPanel && historyPanel) {
    tabInfo.addEventListener('click', () => {
      tabInfo.classList.add('bg-gray-700');
      tabHistory.classList.remove('bg-gray-700');
      infoPanel.classList.remove('hidden');
      historyPanel.classList.add('hidden');
    });
    tabHistory.addEventListener('click', () => {
      tabHistory.classList.add('bg-gray-700');
      tabInfo.classList.remove('bg-gray-700');
      infoPanel.classList.add('hidden');
      historyPanel.classList.remove('hidden');
    });
  }
});

async function renderFriendsList() {
  const container = document.getElementById('friends-list');
  if (!container) return;
  container.innerHTML = 'Chargement...';
  const res = await fetch('/api/friends');
  if (!res.ok) {
    container.innerHTML = 'Erreur lors du chargement des amis.';
    return;
  }
  const friends = await res.json();
  if (!friends.length) {
    container.innerHTML = '<div>Aucun ami pour le moment.</div>';
    return;
  }
  container.innerHTML = friends.map((f: any) => `
    <div class="flex items-center mb-2 friend-item" data-id="${f.id}" style="cursor:pointer;">
      <img src="${f.avatar || '/avatars/default.png'}" alt="Avatar" class="w-8 h-8 rounded-full mr-2">
      <span>${f.displayName}</span>
      <button class="ml-auto text-red-500 remove-friend-btn" data-id="${f.id}">Retirer</button>
    </div>
  `).join('');

  container.querySelectorAll('.remove-friend-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (e.target as HTMLElement).getAttribute('data-id');
      if (id) {
        await fetch(`/api/friends/${id}`, { method: 'DELETE' });
        renderFriendsList();
      }
    });
  });

  container.querySelectorAll('.friend-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      const id = (item as HTMLElement).getAttribute('data-id');
      if (id) {
        const friend = friends.find((f: any) => f.id == id);
        if (friend && friend.displayName) {
          const res = await fetch(`/api/user/${encodeURIComponent(friend.displayName)}`);
          if (res.ok) {
            const user = await res.json();
            showView('public-profile', true, user);
          }
        }
      }
    });
  });
}

async function renderFriendRequests() {
  const container = document.getElementById('friend-requests-list');
  if (!container) return;
  container.innerHTML = 'Chargement...';
  const res = await fetch('/api/friends/requests');
  if (!res.ok) {
    container.innerHTML = 'Erreur lors du chargement des demandes.';
    return;
  }
  const requests = await res.json();
  if (!requests.length) {
    container.innerHTML = '<div>Aucune demande en attente.</div>';
    return;
  }
  container.innerHTML = requests.map((u: any) => `
  <div class="flex items-center mb-2">
    <img src="${u.avatar || '/avatars/default.png'}" alt="Avatar" class="w-8 h-8 rounded-full mr-2">
    <span>${u.displayName}</span>
    <button class="ml-auto bg-green-500 text-white px-2 py-1 rounded accept-friend-btn" data-id="${u.friendRequestId}">Accepter</button>
  </div>
`).join('');
  container.querySelectorAll('.accept-friend-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.target as HTMLElement).getAttribute('data-id');
      if (id) {
        await fetch(`/api/friends/${id}/accept`, { method: 'POST' });
        renderFriendRequests();
        renderFriendsList();
      }
    });
  });
}

if (publicProfileSection) {
  publicProfileSection.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    if (target && target.id === 'add-friend-btn' && target.dataset.userid) {
      const res = await fetch(`/api/friends/${target.dataset.userid}`, { method: 'POST' });
      if (res.ok) {
        alert('Ami ajouté !');
        if (!profileSection.classList.contains('hidden')) {
          renderFriendsList();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur lors de l\'ajout');
      }
    }
  });
}

function addLogoutButton() {
  if (!document.getElementById('logout-btn')) {
    const btn = document.getElementById('logout-btn');
    if (!btn) {
      return
    }
    if (homeSection) homeSection.appendChild(btn);
    if (profileSection) profileSection.appendChild(btn.cloneNode(true));
  }

  document.querySelectorAll('#logout-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      showView('login');
    });
  });
}

window.addEventListener('popstate', (event) => {
  const view = event.state?.view || 'login';
  showView(view, false);
});

if (location.pathname === '/register') showView('register', false);
else if (location.pathname === '/home') showView('home', false);
else if (location.pathname === '/game') showView('game', false);
else if (location.pathname === '/profile') showView('profile', false);
else showView('login', false);

const userId = localStorage.getItem('userId');
await fetch('/api/me', {
  method: 'GET',
  headers: {
    'X-User-Id': userId ?? ''
  }
});

const canvashome = document.getElementById("home-canvas") as HTMLCanvasElement;
const canHome = canvashome?.getContext("2d");
if (!canHome) {
    throw new Error("Impossible de récupérer le contexte du canvas");
}

function drawHomePong() 
{
    if (!canHome) return;
    canHome.clearRect(0, 0, canvashome.width, canvashome.height);
    canHome.save();
    canHome.strokeStyle = "white";
    canHome.setLineDash([10, 10]);
    canHome.beginPath();
    canHome.moveTo(canvashome.width / 2, 0);
    canHome.lineTo(canvashome.width / 2, canvashome.height);
    canHome.stroke();
    canHome.setLineDash([]);
    canHome.restore();

    canHome.fillStyle = "white";
    canHome.fillRect(20, 80, 10, 60);
    canHome.fillRect(canvashome.width - 30, 10, 10, 60);

    canHome.beginPath();
    canHome.arc(100, 100, 6, 0, Math.PI * 2);
    canHome.fillStyle = "white";
    canHome.fill();
}
