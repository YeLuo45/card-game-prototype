import subprocess, json, base64, time

token = subprocess.run(['gh', 'auth', 'token'], capture_output=True, text=True).stdout.strip()
owner, repo = 'YeLuo45', 'card-game-prototype'
branch = 'gh-pages'

def api(method, path, data=None):
    payload = json.dumps(data).encode() if data else None
    headers = [
        '-H', f'Authorization: Bearer {token}',
        '-H', 'Accept: application/vnd.github.v3+json',
        '-H', 'Content-Type: application/json',
        '-H', 'User-Agent: hermes-agent/1.0',
    ]
    cmd = ['curl', '-s', '-X', method, 'https://api.github.com/repos/' + owner + '/' + repo + path] + headers
    if payload:
        cmd.extend(['-d', payload])
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    txt = r.stdout.strip()
    if not txt:
        return {}
    try:
        return json.loads(txt)
    except:
        print(f'JSON parse error: {txt[:200]}')
        return {}

# Step 1: get current branch SHA
print('Step 1: get ref')
ref = api('GET', f'/git/refs/heads/{branch}')
remote_sha = ref['object']['sha']
print(f'  remote_sha: {remote_sha}')

# Step 2: get parent tree SHA
print('Step 2: get commit tree')
commit_data = api('GET', f'/git/commits/{remote_sha}')
parent_tree = commit_data['tree']['sha']
print(f'  parent_tree: {parent_tree}')

# Step 3: create blobs for changed files
local_files = [
    ('card-phoenix-shrine.js', 'card-phoenix-shrine.js'),
    ('card-phoenix-shrine.test.js', 'card-phoenix-shrine.test.js'),
    ('index.html', 'index.html'),
]

tree_entries = []
for path_in_repo, local_path in local_files:
    with open(local_path, 'rb') as f:
        content = f.read()
    content_b64 = base64.b64encode(content).decode()
    blob = api('POST', '/git/blobs', {'content': content_b64, 'encoding': 'base64'})
    sha = blob['sha']
    tree_entries.append({'path': path_in_repo, 'sha': sha, 'mode': '100644', 'type': 'blob'})
    print(f'  blob {path_in_repo}: {sha[:8]}...')
    time.sleep(0.5)

# Step 4: create tree
print('Step 4: create tree')
new_tree = api('POST', '/git/trees', {'base_tree': parent_tree, 'tree': tree_entries})
new_tree_sha = new_tree['sha']
print(f'  new_tree_sha: {new_tree_sha}')

# Step 5: create commit
print('Step 5: create commit')
new_commit = api('POST', '/git/commits', {
    'message': 'feat: V221 Card Phoenix Shrine\n\nPhoenix shrine with rebirth rituals. ruflo. 60 tests 100%.',
    'tree': new_tree_sha,
    'parents': [remote_sha]
})
new_commit_sha = new_commit['sha']
print(f'  new_commit_sha: {new_commit_sha}')

# Step 6: update ref
print('Step 6: update ref')
result = api('PATCH', f'/git/refs/heads/{branch}', {'sha': new_commit_sha})
print(f'  updated: {result.get("object", {}).get("sha", result)}')