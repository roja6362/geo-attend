from flask import Blueprint, jsonify
from models import BlockchainRecord
import json

blockchain_bp = Blueprint('blockchain', __name__)

@blockchain_bp.route('/', methods=['GET'])
def get_chain():
    blocks = BlockchainRecord.query.order_by(BlockchainRecord.block_id.desc()).all()
    chain_data = []
    
    for block in blocks:
        chain_data.append({
            "block_id": block.block_id,
            "timestamp": block.timestamp,
            "attendance_id": block.attendance_id,
            "previous_hash": block.previous_hash,
            "current_hash": block.current_hash,
            "nonce": block.nonce,
            "data": json.loads(block.data)
        })
        
    return jsonify({
        "length": len(chain_data),
        "chain": chain_data
    }), 200

@blockchain_bp.route('/verify', methods=['GET'])
def verify_chain():
    from blockchain import blockchain
    is_valid = blockchain.is_chain_valid()
    return jsonify({
        "is_valid": is_valid,
        "msg": "Blockchain is valid and immutable" if is_valid else "Blockchain integrity compromised!"
    }), 200
