import hashlib
import json
from time import time
from models import db, BlockchainRecord

class Blockchain:
    def __init__(self):
        # We will load the chain from the database
        pass

    def create_block(self, attendance_id, data, previous_hash):
        block = {
            'timestamp': time(),
            'attendance_id': attendance_id,
            'data': data,
            'previous_hash': previous_hash or self.hash(self.get_last_block()),
            'nonce': 0
        }

        # Proof of work (simple implementation: find a hash starting with '0000')
        block = self.proof_of_work(block)
        
        # Save to database
        new_record = BlockchainRecord(
            timestamp=block['timestamp'],
            attendance_id=block['attendance_id'],
            previous_hash=block['previous_hash'],
            current_hash=block['hash'],
            nonce=block['nonce'],
            data=json.dumps(block['data'])
        )
        db.session.add(new_record)
        db.session.commit()
        return new_record

    def get_last_block(self):
        return BlockchainRecord.query.order_by(BlockchainRecord.block_id.desc()).first()

    def proof_of_work(self, block):
        block['nonce'] = 0
        computed_hash = self.hash(block)
        while not computed_hash.startswith('0000'):
            block['nonce'] += 1
            computed_hash = self.hash(block)
        
        block['hash'] = computed_hash
        return block

    def hash(self, block):
        if isinstance(block, BlockchainRecord):
            # Reconstruct dictionary for hashing
            block_dict = {
                'timestamp': block.timestamp,
                'attendance_id': block.attendance_id,
                'data': json.loads(block.data),
                'previous_hash': block.previous_hash,
                'nonce': block.nonce
            }
        else:
            block_dict = {
                'timestamp': block['timestamp'],
                'attendance_id': block['attendance_id'],
                'data': block['data'],
                'previous_hash': block['previous_hash'],
                'nonce': block['nonce']
            }
            
        encoded_block = json.dumps(block_dict, sort_keys=True).encode()
        return hashlib.sha256(encoded_block).hexdigest()

    def is_chain_valid(self):
        chain = BlockchainRecord.query.order_by(BlockchainRecord.block_id.asc()).all()
        for i in range(1, len(chain)):
            current_block = chain[i]
            previous_block = chain[i-1]
            
            # Check previous hash
            if current_block.previous_hash != current_block.current_hash: # Wait, the previous_block's current_hash
                if current_block.previous_hash != previous_block.current_hash:
                    return False
            
            # Verify the hash matches the data
            if current_block.current_hash != self.hash(current_block):
                return False
                
        return True

# Initialize a global instance or handle it per request
blockchain = Blockchain()
